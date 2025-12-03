from pydantic_settings import BaseSettings
from pydantic import Field, field_validator


class Settings(BaseSettings):
    project_name: str = "Newsletter"
    database_url: str = Field(
        default="sqlite:///./newsletter.db",
        description="Database connection string. Use PostgreSQL in production.",
    )
    secret_key: str = Field(default="change-me", description="JWT secret key")
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24
    openai_api_key: str | None = None
    environment: str = "local"
    debug: bool = False
    super_admin_emails: list[str] | str = Field(default="")
    api_port: int = Field(default=8000, description="Port d'écoute de l'API (développement)")
    web_port: int = Field(default=5173, description="Port du frontend (développement)")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    @field_validator("super_admin_emails", mode="before")
    @classmethod
    def split_emails(cls, v):
        if isinstance(v, str):
            return [item.strip() for item in v.split(",") if item.strip()]
        return v


settings = Settings()
