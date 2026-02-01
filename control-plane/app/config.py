from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    DATABASE_URL: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    
    # SMTP Settings
    SMTP_HOST: str | None = None
    SMTP_PORT: int | None = None
    SMTP_MAIL: str | None = None
    SMTP_PASS: str | None = None
    

    
    class Config:
        # Look for .env file in project root (2 levels up from this file)
        # This works for both Docker and manual runs
        env_file = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
        # Also try current directory as fallback
        env_file_encoding = 'utf-8'


settings = Settings()

