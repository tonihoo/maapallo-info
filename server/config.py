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
        return f"postgresql+asyncpg://{self.pg_user}:{self.pg_pass}@{self.pg_host}:{self.pg_port}/{self.pg_database}"

    @property
    def database_url_sync(self) -> str:
        return f"postgresql://{self.pg_user}:{self.pg_pass}@{self.pg_host}:{self.pg_port}/{self.pg_database}"

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()
