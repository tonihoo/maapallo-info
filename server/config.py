from pydantic_settings import BaseSettings


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
        # For local development, don't include any SSL parameters
        if self.environment == "development":
            return f"postgresql+asyncpg://{self.pg_user}:{self.pg_pass}@{self.pg_host}:{self.pg_port}/{self.pg_database}"

        # For production, use SSL parameter (asyncpg doesn't support sslmode)
        if self.pg_sslmode == "disable":
            ssl_param = "ssl=false"
        elif self.pg_sslmode == "require":
            ssl_param = "ssl=true"
        else:
            ssl_param = "ssl=prefer"

        return f"postgresql+asyncpg://{self.pg_user}:{self.pg_pass}@{self.pg_host}:{self.pg_port}/{self.pg_database}?{ssl_param}"

    @property
    def database_url_sync(self) -> str:
        # Ensure sslmode is valid
        valid_ssl_modes = [
            "disable",
            "allow",
            "prefer",
            "require",
            "verify-ca",
            "verify-full",
        ]
        ssl_mode = self.pg_sslmode if self.pg_sslmode in valid_ssl_modes else "prefer"

        return f"postgresql://{self.pg_user}:{self.pg_pass}@{self.pg_host}:{self.pg_port}/{self.pg_database}?sslmode={ssl_mode}"

    @property
    def is_production(self) -> bool:
        return self.environment.lower() == "production"

    class Config:
        env_file = ".env"
        case_sensitive = False
        # Allow environment variables to override .env file
        env_file_encoding = "utf-8"


settings = Settings()
