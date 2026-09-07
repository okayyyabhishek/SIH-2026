"""
Sentinel NER — Copernicus Data Space STAC Provider & Satellite Catalog Abstraction (Priority 3)
Connects directly to the official Copernicus Data Space STAC API:
  https://stac.dataspace.copernicus.eu/v1
Targets:
  - sentinel-2-l2a (Optical Surface Reflectance)
  - sentinel-1-slc / sentinel-1-grd (SAR InSAR & Ground Range)
Features:
- Real catalog discovery with bounding box, datetime, and cloud-cover filtering.
- STAC 1.0.0 normalization into domain model (SatelliteScene).
- Secure credential management separating Copernicus OAuth2 tokens from AWS storage credentials.
- Bounded chunk streaming with anti-SSRF allowlist enforcement.
- Synthetic provider isolation strictly forbidden in production mode.
"""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from typing import Any, AsyncIterator, Dict, List, Optional

import httpx

from src.core.config import settings
from src.core.errors import (
    NotFoundException,
    UnauthorizedException,
    UpstreamDependencyUnavailableException,
    ValidationException,
)
from src.core.logging import logger
from src.core.satellite.lineage import get_deterministic_test_fixtures
from src.core.satellite.safety import validate_external_url_ssrf
from src.schemas.satellite import (
    ConnectorStatus,
    ExternalConnectorStatus,
    SatelliteAsset,
    SatelliteScene,
)


class SatelliteProvider(ABC):
    """
    Abstract Base Class defining the contract for satellite catalog discovery and asset streaming.
    Application domain services depend strictly on this abstraction.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Returns the unique identifier of the catalog provider."""
        pass

    @abstractmethod
    async def search_scenes(
        self,
        bbox: List[float],
        datetime_start: Optional[datetime] = None,
        datetime_end: Optional[datetime] = None,
        max_cloud_cover: Optional[float] = None,
        collection: Optional[str] = None,
        limit: int = 20,
    ) -> List[SatelliteScene]:
        """Discovers satellite scenes matching spatial, temporal, and quality constraints."""
        pass

    @abstractmethod
    async def get_scene(self, scene_id: str, collection: Optional[str] = None) -> Optional[SatelliteScene]:
        """Retrieves single scene metadata and asset catalogue."""
        pass

    @abstractmethod
    async def stream_asset(self, asset_url: str) -> AsyncIterator[bytes]:
        """Streams real asset binary in bounded chunks with anti-SSRF protections."""
        pass

    @abstractmethod
    async def check_health(self) -> ExternalConnectorStatus:
        """Evaluates live upstream API connectivity and returns truthful status."""
        pass


class CopernicusSTACProvider(SatelliteProvider):
    """
    Production satellite provider communicating with the Copernicus Data Space Ecosystem STAC API.
    Endpoint: https://stac.dataspace.copernicus.eu/v1
    """

    def __init__(
        self,
        stac_url: Optional[str] = None,
        auth_url: Optional[str] = None,
        client_id: Optional[str] = None,
        client_secret: Optional[str] = None,
        username: Optional[str] = None,
        password: Optional[str] = None,
    ):
        self.base_url = (stac_url or settings.COPERNICUS_STAC_URL).rstrip("/")
        self.auth_url = auth_url or settings.COPERNICUS_AUTH_URL
        self.client_id = client_id or settings.COPERNICUS_CLIENT_ID
        self.client_secret = client_secret or settings.COPERNICUS_CLIENT_SECRET
        self.username = username or settings.COPERNICUS_USERNAME
        self.password = password or settings.COPERNICUS_PASSWORD
        self._cached_token: Optional[str] = None
        self._token_expires_at: float = 0.0

    @property
    def provider_name(self) -> str:
        return "copernicus-cdse"

    @property
    def is_auth_configured(self) -> bool:
        """Determines if Copernicus credentials are provided."""
        has_oauth = bool(self.client_id and self.client_secret)
        has_basic = bool(self.username and self.password)
        return has_oauth or has_basic

    async def _get_auth_token(self) -> str:
        """
        Retrieves or refreshes Copernicus Data Space OAuth2 access token.
        Never logs credentials or bearer tokens.
        """
        import time

        now = time.time()
        if self._cached_token and now < (self._token_expires_at - 60):
            return self._cached_token

        if not self.is_auth_configured:
            raise UnauthorizedException(
                "Copernicus CDSE credentials are not configured. "
                "Set COPERNICUS_CLIENT_ID and COPERNICUS_CLIENT_SECRET or "
                "COPERNICUS_USERNAME and COPERNICUS_PASSWORD in environment."
            )

        data: Dict[str, str] = {}
        if self.client_id and self.client_secret:
            data = {
                "grant_type": "client_credentials",
                "client_id": self.client_id,
                "client_secret": self.client_secret,
            }
        elif self.username and self.password:
            data = {
                "grant_type": "password",
                "client_id": "cdse-public",
                "username": self.username,
                "password": self.password,
            }

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(self.auth_url, data=data)
                if resp.status_code != 200:
                    logger.error(
                        "Copernicus authentication failed",
                        extra={"status_code": resp.status_code, "auth_url": self.auth_url},
                    )
                    raise UnauthorizedException(
                        f"Copernicus CDSE authentication rejected with HTTP {resp.status_code}."
                    )
                token_data = resp.json()
                self._cached_token = token_data["access_token"]
                expires_in = token_data.get("expires_in", 600)
                self._token_expires_at = now + float(expires_in)
                return self._cached_token
        except httpx.RequestError as exc:
            logger.error("Failed to connect to Copernicus auth endpoint", extra={"error": str(exc)})
            raise UpstreamDependencyUnavailableException(
                dependency="Copernicus Identity Service",
                details={"auth_url": self.auth_url, "error": str(exc)},
            )

    def _normalize_stac_item(self, item: Dict[str, Any], default_collection: str) -> SatelliteScene:
        """Normalizes an official Copernicus STAC 1.0.0 Item into the Sentinel NER domain model."""
        item_id = item.get("id", "")
        coll = item.get("collection") or default_collection
        props = item.get("properties", {})
        dt_str = props.get("datetime")
        if dt_str:
            try:
                dt = datetime.fromisoformat(dt_str.replace("Z", "+00:00"))
            except ValueError:
                dt = datetime.now(timezone.utc)
        else:
            dt = datetime.now(timezone.utc)

        raw_bbox = item.get("bbox") or [-180.0, -90.0, 180.0, 90.0]
        # Bbox validation
        if len(raw_bbox) < 4:
            raise ValidationException(f"Malformed STAC item '{item_id}': Bounding box must contain 4 coordinates.")

        bbox = [float(raw_bbox[0]), float(raw_bbox[1]), float(raw_bbox[2]), float(raw_bbox[3])]

        # Extract cloud cover
        cloud_cover = props.get("eo:cloud_cover")
        if cloud_cover is None:
            cloud_cover = props.get("cloudCover")
        if cloud_cover is not None:
            try:
                cloud_cover = float(cloud_cover)
            except (ValueError, TypeError):
                cloud_cover = None

        # Parse assets
        normalized_assets: Dict[str, SatelliteAsset] = {}
        for asset_key, raw_asset in item.get("assets", {}).items():
            if isinstance(raw_asset, dict):
                normalized_assets[asset_key] = SatelliteAsset(
                    name=asset_key,
                    href=raw_asset.get("href", ""),
                    title=raw_asset.get("title"),
                    type=raw_asset.get("type"),
                    roles=raw_asset.get("roles", []),
                    size_bytes=raw_asset.get("file:size") or raw_asset.get("size"),
                )

        return SatelliteScene(
            id=item_id,
            provider="copernicus",
            collection=coll,
            datetime=dt,
            geometry=item.get("geometry", {}),
            bbox=bbox,
            cloud_cover=cloud_cover,
            assets=normalized_assets,
            properties=props,
            links=item.get("links", []),
        )

    async def search_scenes(
        self,
        bbox: List[float],
        datetime_start: Optional[datetime] = None,
        datetime_end: Optional[datetime] = None,
        max_cloud_cover: Optional[float] = None,
        collection: Optional[str] = None,
        limit: int = 20,
    ) -> List[SatelliteScene]:
        """
        Executes an actual STAC API POST search request against the Copernicus catalog.
        Endpoint: https://stac.dataspace.copernicus.eu/v1/search
        """
        if len(bbox) != 4:
            raise ValidationException("Bounding box must have 4 coordinates: [min_lon, min_lat, max_lon, max_lat]")
        if bbox[0] > bbox[2] or bbox[1] > bbox[3]:
            raise ValidationException(f"Invalid inverted bounding box: {bbox}")

        target_collection = collection or settings.COPERNICUS_COLLECTION

        # Build STAC search query payload
        payload: Dict[str, Any] = {
            "collections": [target_collection],
            "bbox": bbox,
            "limit": max(1, min(limit, 100)),
        }

        # Temporal filter (ISO 8601 interval)
        if datetime_start or datetime_end:
            start_str = datetime_start.isoformat() if datetime_start else ".."
            end_str = datetime_end.isoformat() if datetime_end else ".."
            payload["datetime"] = f"{start_str}/{end_str}"

        # Cloud cover query filter
        if max_cloud_cover is not None:
            payload["query"] = {"eo:cloud_cover": {"lte": float(max_cloud_cover)}}

        logger.info(
            "STAC_SEARCH_STARTED",
            extra={
                "provider": self.provider_name,
                "collection": target_collection,
                "bbox": bbox,
                "limit": limit,
            },
        )

        search_url = f"{self.base_url}/search"
        validate_external_url_ssrf(search_url)

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                headers = {"Accept": "application/geo+json, application/json"}
                response = await client.post(search_url, json=payload, headers=headers)

                if response.status_code != 200:
                    logger.error(
                        "Copernicus STAC search failed",
                        extra={"status_code": response.status_code, "body": response.text[:200]},
                    )
                    raise UpstreamDependencyUnavailableException(
                        dependency="Copernicus Data Space STAC",
                        details={"status_code": response.status_code, "url": search_url},
                    )

                data = response.json()
                features = data.get("features", [])

                scenes = [self._normalize_stac_item(feat, target_collection) for feat in features]
                logger.info(
                    "STAC_SEARCH_COMPLETED",
                    extra={
                        "provider": self.provider_name,
                        "collection": target_collection,
                        "items_discovered": len(scenes),
                    },
                )
                return scenes

        except httpx.RequestError as exc:
            logger.error("Failed to connect to Copernicus STAC endpoint", extra={"error": str(exc)})
            raise UpstreamDependencyUnavailableException(
                dependency="Copernicus Data Space STAC",
                details={"url": search_url, "error": str(exc)},
            )

    async def get_scene(self, scene_id: str, collection: Optional[str] = None) -> Optional[SatelliteScene]:
        """Retrieves a single STAC Item by ID from the Copernicus catalog."""
        if not scene_id or not isinstance(scene_id, str):
            raise ValidationException("scene_id must be a non-empty string.")

        target_collection = collection or settings.COPERNICUS_COLLECTION
        item_url = f"{self.base_url}/collections/{target_collection}/items/{scene_id}"
        validate_external_url_ssrf(item_url)

        try:
            async with httpx.AsyncClient(timeout=20.0) as client:
                headers = {"Accept": "application/geo+json, application/json"}
                response = await client.get(item_url, headers=headers)

                if response.status_code == 404:
                    return None
                if response.status_code != 200:
                    raise UpstreamDependencyUnavailableException(
                        dependency="Copernicus Data Space STAC",
                        details={"status_code": response.status_code, "url": item_url},
                    )

                data = response.json()
                return self._normalize_stac_item(data, target_collection)
        except httpx.RequestError as exc:
            raise UpstreamDependencyUnavailableException(
                dependency="Copernicus Data Space STAC",
                details={"url": item_url, "error": str(exc)},
            )

    async def stream_asset(self, asset_url: str) -> AsyncIterator[bytes]:
        """
        Streams a real asset binary from Copernicus Data Space in bounded chunks (64 KB).
        Enforces SSRF allowlist and handles OAuth2 authentication when required.
        """
        validate_external_url_ssrf(asset_url)

        headers: Dict[str, str] = {}
        if self.is_auth_configured:
            token = await self._get_auth_token()
            headers["Authorization"] = f"Bearer {token}"

        logger.info("ASSET_DOWNLOAD_STARTED", extra={"provider": self.provider_name, "url": asset_url})

        async with httpx.AsyncClient(timeout=60.0, follow_redirects=True) as client:
            async with client.stream("GET", asset_url, headers=headers) as response:
                if response.status_code in (401, 403):
                    raise UnauthorizedException(
                        f"Copernicus asset download access denied (HTTP {response.status_code}). "
                        f"Check Copernicus CDSE credentials."
                    )
                if response.status_code == 404:
                    raise NotFoundException(f"Copernicus asset not found at URL: {asset_url}")
                if response.status_code != 200:
                    raise UpstreamDependencyUnavailableException(
                        dependency="Copernicus Data Space Asset Store",
                        details={"status_code": response.status_code, "url": asset_url},
                    )

                async for chunk in response.aiter_bytes(chunk_size=65536):
                    yield chunk

    async def check_health(self) -> ExternalConnectorStatus:
        """Truthful health check verifying live STAC connectivity."""
        now = datetime.now(timezone.utc)
        test_url = f"{self.base_url}"
        auth_status = self.is_auth_configured

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(test_url)
                if resp.status_code == 200:
                    return ExternalConnectorStatus(
                        connector_id="copernicus-cdse-v1",
                        name="Copernicus Data Space Ecosystem (CDSE)",
                        catalog_type="STAC 1.0.0 API",
                        endpoint_url=self.base_url,
                        status=ConnectorStatus.AVAILABLE if auth_status else ConnectorStatus.AUTH_REQUIRED,
                        auth_configured=auth_status,
                        last_checked=now,
                        rate_limit_remaining=None,
                        message=(
                            "Copernicus STAC catalog accessible and operational."
                            if auth_status
                            else "Copernicus STAC public catalog accessible. Ingestion auth credentials not provided."
                        ),
                    )
                return ExternalConnectorStatus(
                    connector_id="copernicus-cdse-v1",
                    name="Copernicus Data Space Ecosystem (CDSE)",
                    catalog_type="STAC 1.0.0 API",
                    endpoint_url=self.base_url,
                    status=ConnectorStatus.DEGRADED,
                    auth_configured=auth_status,
                    last_checked=now,
                    rate_limit_remaining=None,
                    message=f"Copernicus STAC returned HTTP {resp.status_code}.",
                )
        except Exception as exc:
            return ExternalConnectorStatus(
                connector_id="copernicus-cdse-v1",
                name="Copernicus Data Space Ecosystem (CDSE)",
                catalog_type="STAC 1.0.0 API",
                endpoint_url=self.base_url,
                status=ConnectorStatus.UNAVAILABLE,
                auth_configured=auth_status,
                last_checked=now,
                rate_limit_remaining=None,
                message=f"Copernicus STAC connectivity check failed: {exc}",
            )


class SyntheticSatelliteProvider(SatelliteProvider):
    """
    Synthetic / fixture provider strictly for automated tests and demo mode.
    Forbidden in production mode!
    """

    def __init__(self):
        if settings.SATELLITE_MODE == "production":
            raise ValidationException(
                "SyntheticSatelliteProvider is strictly forbidden in production mode (SATELLITE_MODE=production)."
            )

    @property
    def provider_name(self) -> str:
        return "synthetic-fixture-provider"

    async def search_scenes(
        self,
        bbox: List[float],
        datetime_start: Optional[datetime] = None,
        datetime_end: Optional[datetime] = None,
        max_cloud_cover: Optional[float] = None,
        collection: Optional[str] = None,
        limit: int = 20,
    ) -> List[SatelliteScene]:
        if settings.SATELLITE_MODE == "production":
            raise ValidationException("Synthetic data search is forbidden in production mode.")

        fixtures = get_deterministic_test_fixtures()
        scenes: List[SatelliteScene] = []
        for obs in fixtures["observations"]:
            scene = SatelliteScene(
                id=obs.id,
                provider="synthetic",
                collection=collection or "sentinel-1-slc",
                datetime=obs.acquisition_time,
                geometry=obs.footprint,
                bbox=obs.bbox,
                cloud_cover=0.0,
                assets={
                    "visual": SatelliteAsset(
                        name="visual",
                        href=obs.source_uri or "https://dataspace.copernicus.eu/sample.tif",
                        title="Synthetic Visual Asset",
                    )
                },
                properties={"mission": obs.mission.value, "product_type": obs.product_type.value},
            )
            scenes.append(scene)
        return scenes[:limit]

    async def get_scene(self, scene_id: str, collection: Optional[str] = None) -> Optional[SatelliteScene]:
        if settings.SATELLITE_MODE == "production":
            raise ValidationException("Synthetic data lookup is forbidden in production mode.")

        scenes = await self.search_scenes(bbox=[0, 0, 0, 0])
        for s in scenes:
            if s.id == scene_id:
                return s
        return None

    async def stream_asset(self, asset_url: str) -> AsyncIterator[bytes]:
        if settings.SATELLITE_MODE == "production":
            raise ValidationException("Synthetic asset streaming is forbidden in production mode.")

        from src.core.satellite.lineage import build_synthetic_geotiff_bytes
        yield build_synthetic_geotiff_bytes(64, 64)

    async def check_health(self) -> ExternalConnectorStatus:
        return ExternalConnectorStatus(
            connector_id="synthetic-provider",
            name="Synthetic Test Fixture Provider",
            catalog_type="Local Test Fixture",
            endpoint_url="internal://fixtures",
            status=ConnectorStatus.AVAILABLE,
            auth_configured=True,
            last_checked=datetime.now(timezone.utc),
            rate_limit_remaining=None,
            message="Deterministic test fixtures available for test/demo mode.",
        )


def get_satellite_provider() -> SatelliteProvider:
    """
    Factory function returning the authoritative SatelliteProvider.
    Enforces that production environments use real Copernicus STAC.
    """
    mode = getattr(settings, "SATELLITE_MODE", "production").lower()
    provider_type = getattr(settings, "SATELLITE_PROVIDER", "copernicus").lower()

    if mode == "production":
        if provider_type != "copernicus":
            raise ValidationException(
                f"SATELLITE_PROVIDER='{provider_type}' is invalid in production mode. Must be 'copernicus'."
            )
        return CopernicusSTACProvider()

    if mode in ("test", "demo"):
        if provider_type == "synthetic":
            return SyntheticSatelliteProvider()
        return CopernicusSTACProvider()

    raise ValidationException(f"Unsupported SATELLITE_MODE '{mode}'. Must be 'production', 'test', or 'demo'.")


# Authoritative singleton provider instance
satellite_provider: SatelliteProvider = get_satellite_provider()
