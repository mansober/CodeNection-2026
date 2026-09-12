from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Santai API"
    app_version: str = "0.1.0"
    environment: str = "development"
    database_url: str = "postgresql+psycopg://app:app@localhost:5432/app"
    cors_origins: str = "http://localhost:8081,http://localhost:19006"
    storage_dir: Path = Path("data/materials")
    session_days: int = Field(default=30, ge=1, le=365)
    max_upload_bytes: int = Field(default=10 * 1024 * 1024, ge=1, le=100 * 1024 * 1024)
    max_json_bytes: int = Field(default=1024 * 1024, ge=1024, le=5 * 1024 * 1024)
    max_import_days: int = Field(default=180, ge=1, le=180)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
