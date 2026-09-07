"""
Sentinel NER — Core Configuration
Pydantic v2 Settings for environment validation and strict runtime configuration.
"""

from typing import List

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application Baseline
    APP_NAME: str = "sentinel-ner"
    APP_VERSION: str = "0.1.0"
    APP_ENV: str = Field(default="development", description="Environment: development, test, staging, production")
    ENABLE_DEV_FIXTURES: bool = Field(default=True, description="Enable development seed fixtures. Strictly disabled in production.")
    DEBUG: bool = False
    LOG_LEVEL: str = Field(default="INFO", description="Logging level: DEBUG, INFO, WARNING, ERROR, CRITICAL")

    # Server Binding
    API_HOST: str = "0.0.0.0"
    API_PORT: int = 8000

    # Security
    SECRET_KEY: str = Field(
        default="sentinel-dev-secret-key-change-in-production-min-32-chars-long",
        description="Cryptographic secret key for signing tokens/sessions"
    )
    CORS_ORIGINS: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        description="Comma-separated list of allowed CORS origins"
    )

    # Operational Storage (MongoDB Atlas)
    MONGODB_URI: str = Field(
        default="mongodb://localhost:27017/sentinel_ner",
        description="MongoDB connection string"
    )
    MONGODB_DB_NAME: str = "sentinel_ner"
    MONGODB_MIN_POOL_SIZE: int = 5
    MONGODB_MAX_POOL_SIZE: int = 50

    # Transient Storage & Jobs (Redis)
    REDIS_URL: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL for caching and rate limiting"
    )

    # Persistence Backend Architecture
    PERSISTENCE_BACKEND: str = Field(
        default="auto",
        description="Persistence backend: 'auto', 'mongodb', or 'in_memory'. Strictly 'mongodb' in staging/production."
    )

    # Object Storage (AWS S3) Configuration
    STORAGE_BACKEND: str = Field(
        default="auto",
        description="Object storage backend: 'auto' ('s3' in prod/staging, 'local' in dev/test), 's3', or 'local'."
    )
    AWS_REGION: str = Field(default="eu-north-1", description="AWS Region for S3 bucket")
    AWS_S3_BUCKET: str = Field(default="sentinel-ner-production-okayyyabhishek", description="Target AWS S3 bucket name")
    S3_BUCKET_NAME: str = Field(default="sentinel-ner-production-okayyyabhishek", description="Legacy alias for AWS_S3_BUCKET")
    AWS_ACCESS_KEY_ID: str | None = Field(default=None, description="Optional local AWS Access Key ID. Production uses IAM roles.")
    AWS_SECRET_ACCESS_KEY: str | None = Field(default=None, description="Optional local AWS Secret Access Key. Production uses IAM roles.")
    S3_ENDPOINT_URL: str | None = Field(default=None, description="Optional custom S3 endpoint URL (e.g. MinIO or LocalStack)")
    SATELLITE_STORAGE_DIR: str = Field(default="apps/api/storage/satellite", description="Local storage fallback directory for test/demo mode")

    # Satellite Ingestion & Copernicus CDSE STAC Configuration
    SATELLITE_MODE: str = Field(
        default="production",
        description="Operational satellite mode: 'production', 'test', or 'demo'. Production strictly enforces real Copernicus STAC."
    )
    SATELLITE_PROVIDER: str = Field(
        default="copernicus",
        description="Satellite catalog provider: 'copernicus' (real CDSE STAC) or 'synthetic' (fixtures only in test/demo mode)."
    )
    COPERNICUS_STAC_URL: str = Field(
        default="https://stac.dataspace.copernicus.eu/v1",
        description="Official Copernicus Data Space Ecosystem STAC API base URL"
    )
    COPERNICUS_AUTH_URL: str = Field(
        default="https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
        description="Copernicus Data Space OAuth2 token endpoint"
    )
    COPERNICUS_COLLECTION: str = Field(
        default="sentinel-2-l2a",
        description="Default target satellite collection (e.g. sentinel-2-l2a, sentinel-1-slc)"
    )
    COPERNICUS_CLIENT_ID: str | None = Field(default=None, description="Copernicus CDSE OAuth2 Client ID")
    COPERNICUS_CLIENT_SECRET: str | None = Field(default=None, description="Copernicus CDSE OAuth2 Client Secret")
    COPERNICUS_USERNAME: str | None = Field(default=None, description="Copernicus CDSE account username")
    COPERNICUS_PASSWORD: str | None = Field(default=None, description="Copernicus CDSE account password")

    # Notification Gateway Configuration (Pre-Stage-9 Hardening)
    NOTIFICATION_PROVIDER: str = Field(
        default="auto",
        description="Notification provider: 'auto' ('aws_sns' in prod/staging, 'simulated' in dev/test), 'aws_sns', 'webhook', or 'simulated'."
    )
    AWS_SNS_REGION: str = Field(default="eu-north-1", description="AWS Region for SNS notification gateway")
    AWS_SNS_TOPIC_ARN: str | None = Field(default=None, description="Optional default AWS SNS Topic ARN for emergency broadcasts")
    NOTIFICATION_WEBHOOK_URL: str | None = Field(default=None, description="Optional HTTP Webhook endpoint for notification dispatch")

    # External Feeds / Adapters Health Check Flags
    GSI_NLFC_ENABLED: bool = False
    IMD_API_ENABLED: bool = False
    ISRO_BHUVAN_ENABLED: bool = False
    BHASHINI_ENABLED: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True
    )

    @field_validator("CORS_ORIGINS")
    @classmethod
    def parse_cors_origins(cls, v: str) -> str:
        return v.strip()

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_mongo_authoritative(self) -> bool:
        """Determines if MongoDB Atlas is the authoritative persistent system of record."""
        if self.PERSISTENCE_BACKEND == "mongodb":
            return True
        if self.PERSISTENCE_BACKEND == "in_memory":
            return False
        # auto: production and staging strictly require mongodb
        if self.APP_ENV in ("production", "staging"):
            return True
        return False

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str, info) -> str:
        # In staging or production, enforce minimum entropy and no default dev keys
        # We can inspect values if needed, or enforce at least 32 characters
        if len(v) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters long for cryptographic safety")
        return v

    @model_validator(mode="after")
    def enforce_production_constraints(self) -> "Settings":
        # Keep AWS_S3_BUCKET and S3_BUCKET_NAME synchronized
        if self.AWS_S3_BUCKET and self.AWS_S3_BUCKET != "sentinel-ner-artifacts-dev":
            self.S3_BUCKET_NAME = self.AWS_S3_BUCKET
        elif self.S3_BUCKET_NAME and self.S3_BUCKET_NAME != "sentinel-ner-artifacts-dev":
            self.AWS_S3_BUCKET = self.S3_BUCKET_NAME

        if self.APP_ENV in ("production", "staging"):
            self.ENABLE_DEV_FIXTURES = False
            if self.PERSISTENCE_BACKEND == "in_memory":
                raise ValueError("PERSISTENCE_BACKEND='in_memory' is strictly forbidden in production and staging environments.")
            if self.PERSISTENCE_BACKEND == "auto":
                self.PERSISTENCE_BACKEND = "mongodb"
            if not self.MONGODB_URI or not self.MONGODB_URI.strip():
                raise ValueError("MONGODB_URI is mandatory and cannot be empty in production and staging environments.")
            uri_lower = self.MONGODB_URI.strip().lower()
            if "localhost" in uri_lower or "127.0.0.1" in uri_lower:
                raise ValueError("Development default localhost MONGODB_URI is strictly forbidden in production and staging environments.")
            if not (uri_lower.startswith("mongodb://") or uri_lower.startswith("mongodb+srv://")):
                raise ValueError("Invalid MONGODB_URI format in production/staging environment.")
            if not self.MONGODB_DB_NAME or not self.MONGODB_DB_NAME.strip():
                raise ValueError("MONGODB_DB_NAME is mandatory in production and staging environments.")

            # Priority 2: Storage Backend constraint
            if self.STORAGE_BACKEND == "local":
                raise ValueError("STORAGE_BACKEND='local' is strictly forbidden in production and staging environments. AWS S3 required.")
            if self.STORAGE_BACKEND == "auto":
                self.STORAGE_BACKEND = "s3"
            if not self.AWS_S3_BUCKET or not self.AWS_S3_BUCKET.strip():
                raise ValueError("AWS_S3_BUCKET is mandatory and cannot be empty in production and staging environments.")

            # Priority 3: Satellite Mode constraint
            if self.SATELLITE_MODE != "production":
                raise ValueError(f"SATELLITE_MODE='{self.SATELLITE_MODE}' is forbidden in production/staging. Must be 'production'.")

            # Notification Provider constraint (Pre-Stage-9 Hardening)
            if self.NOTIFICATION_PROVIDER == "simulated":
                raise ValueError("NOTIFICATION_PROVIDER='simulated' is strictly forbidden in production and staging environments.")
            if self.NOTIFICATION_PROVIDER == "auto":
                self.NOTIFICATION_PROVIDER = "aws_sns"
            if self.NOTIFICATION_PROVIDER not in ("aws_sns", "webhook"):
                raise ValueError(
                    f"NOTIFICATION_PROVIDER='{self.NOTIFICATION_PROVIDER}' is invalid in production/staging. "
                    "Must be 'aws_sns' or 'webhook'."
                )
            if self.NOTIFICATION_PROVIDER == "webhook" and not (self.NOTIFICATION_WEBHOOK_URL and self.NOTIFICATION_WEBHOOK_URL.strip()):
                raise ValueError("NOTIFICATION_WEBHOOK_URL is mandatory when NOTIFICATION_PROVIDER='webhook' in production/staging.")
        else:
            if self.PERSISTENCE_BACKEND == "auto":
                self.PERSISTENCE_BACKEND = "in_memory"
            if self.STORAGE_BACKEND == "auto":
                self.STORAGE_BACKEND = "local"
            if self.NOTIFICATION_PROVIDER == "auto":
                self.NOTIFICATION_PROVIDER = "simulated"
            if self.APP_ENV in ("development", "test"):
                self.ENABLE_DEV_FIXTURES = True
        return self



settings = Settings()
