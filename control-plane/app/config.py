from pydantic_settings import BaseSettings
import os


class Settings(BaseSettings):
    DATABASE_URL: str
    
    class Config:
        # Look for .env file in project root (2 levels up from this file)
        # This works for both Docker and manual runs
        env_file = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
        # Also try current directory as fallback
        env_file_encoding = 'utf-8'


settings = Settings()

