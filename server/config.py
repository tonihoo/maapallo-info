from urllib.parse import quote_plus

from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    # Server configuration
    server_port: int = 3003
    log_level: str = "info"
    environment: str = "development"

    # Database configuration
    pg_host: str = "db"
    pg_port: int = 5432
    pg_database: str = "db_dev"
    pg_user: str = "db_dev_user"
    pg_pass: str = "DevPassword"
    pg_sslmode: str = "disable"

    # Environment
    node_env: str = "development"

    @property
    def database_url(self) -> str:
        """Build async SQLAlchemy DB URL.

        Supports legacy env var names POSTGRES_* as fallbacks if PG_* are not
        provided (production previously only injected POSTGRES_HOST etc.).
        """
        # Prefer explicit PG_* values, else fallback to POSTGRES_*
        host = self.pg_host or os.getenv("POSTGRES_HOST", self.pg_host)
        port = self.pg_port or int(os.getenv("POSTGRES_PORT", self.pg_port))
        database = (
            self.pg_database
            or os.getenv("POSTGRES_DB")
            or os.getenv("POSTGRES_DATABASE")
            or self.pg_database
        )
        user = self.pg_user or os.getenv("POSTGRES_USER", self.pg_user)
        password = self.pg_pass or os.getenv("POSTGRES_PASSWORD", self.pg_pass)

        encoded_password = quote_plus(password)

        if self.environment == "development":
            return (
                f"postgresql+asyncpg://{user}:{encoded_password}"
                f"@{host}:{port}/{database}"
            )

        base_url = (
            f"postgresql+asyncpg://{user}:{encoded_password}"
            f"@{host}:{port}/{database}"
        )
        if self.pg_sslmode == "disable":
            return base_url
        return f"{base_url}?ssl={self.pg_sslmode}"

    @property
    def database_url_sync(self) -> str:
        # Fallback logic mirrors database_url for synchronous usage.
        host = self.pg_host or os.getenv("POSTGRES_HOST", self.pg_host)
        port = self.pg_port or int(os.getenv("POSTGRES_PORT", self.pg_port))
        database = (
            self.pg_database
            or os.getenv("POSTGRES_DB")
            or os.getenv("POSTGRES_DATABASE")
            or self.pg_database
        )
        user = self.pg_user or os.getenv("POSTGRES_USER", self.pg_user)
        password = self.pg_pass or os.getenv("POSTGRES_PASSWORD", self.pg_pass)
        encoded_password = quote_plus(password)

        # Ensure sslmode is valid
        valid_ssl_modes = [
            "disable",
            "allow",
            "prefer",
            "require",
            "verify-ca",
            "verify-full",
        ]
        ssl_mode = (
            self.pg_sslmode if self.pg_sslmode in valid_ssl_modes else "prefer"
        )

        return (
            f"postgresql://{user}:{encoded_password}"
            f"@{host}:{port}/{database}?sslmode={ssl_mode}"
        )

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    class Config:
        env_file = ".env"
        case_sensitive = False
        # Allow environment variables to override .env file
        env_file_encoding = "utf-8"


settings = Settings()
