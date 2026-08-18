from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    GCP_PROJECT: str = "rj-sms"
    CACHE_TTL_SEGUNDOS: int = 300  # 5 minutos
    CACHE_TTL_METADATA: int = 600  # 10 minutos para freshness de fontes
    CORS_ORIGINS: str = "http://localhost:3000,http://frontend:3000"

    class Config:
        env_file = ".env"


settings = Settings()
