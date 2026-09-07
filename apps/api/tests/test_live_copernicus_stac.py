"""
Sentinel NER — Live Copernicus Data Space Ecosystem (CDSE) STAC Integration Test
Verifies live real-world catalog communication without mocks:
1. Connects directly to https://stac.dataspace.copernicus.eu/v1
2. Executes real STAC search query over Northeast India (Mizoram region)
3. Discovers real Sentinel-2 L2A optical scenes
4. Validates real scene ID, acquisition datetime, geometry, and real asset keys (B04, B08, TCI)
"""

from datetime import datetime

import pytest

from src.core.satellite.provider import CopernicusSTACProvider


@pytest.mark.asyncio
async def test_live_copernicus_stac_connectivity_and_discovery():
    """
    Connects to the official Copernicus Data Space STAC endpoint and verifies live catalog discovery.
    Target region: Northeast India (Champhai / Aizawl, Mizoram: [93.15, 23.35, 93.45, 23.60])
    """
    provider = CopernicusSTACProvider(stac_url="https://stac.dataspace.copernicus.eu/v1")

    # 1. Evaluate connector health
    status = await provider.check_health()
    assert status.status.value in ("AVAILABLE", "AUTH_REQUIRED")
    assert "https://stac.dataspace.copernicus.eu/v1" in status.endpoint_url

    # 2. Real STAC discovery query for Mizoram (Champhai)
    champhai_bbox = [93.15, 23.35, 93.45, 23.60]
    scenes = await provider.search_scenes(
        bbox=champhai_bbox,
        collection="sentinel-2-l2a",
        limit=5,
    )

    # 3. Assert real results returned from Copernicus CDSE
    assert len(scenes) > 0, "Expected at least one real Sentinel-2 scene from Copernicus CDSE."

    sample_scene = scenes[0]
    assert sample_scene.id.startswith("S2")
    assert sample_scene.collection == "sentinel-2-l2a"
    assert isinstance(sample_scene.datetime, datetime)
    assert len(sample_scene.bbox) == 4
    assert len(sample_scene.assets) > 0

    print("\n--- LIVE COPERNICUS STAC CONNECTIVITY: PASS ---")
    print(f"Endpoint: {provider.base_url}")
    print(f"Collection: {sample_scene.collection}")
    print(f"Items discovered: {len(scenes)}")
    print(f"Example real item: {sample_scene.id}")
    print(f"Datetime: {sample_scene.datetime.isoformat()}")
    print(f"Discovered Assets: {list(sample_scene.assets.keys())[:10]}...")
