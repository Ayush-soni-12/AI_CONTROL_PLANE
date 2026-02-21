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

    # Redis api key
    REDIS_URL: str
    
    # Gemini API Key (for AI background analysis)
    GEMINI_API_KEY: str | None = None
    
    SIGNAL_SAMPLING_RATE: float = 1.0  # 100% of success signals stored (cleanup job deletes >7 days)
    
    # RabbitMQ URL for signal queue (@ in password must be URL-encoded as %40)
    RABBITMQ_URL: str 
    

    
    class Config:
        env_file = os.path.join(os.path.dirname(__file__), "..", "..", ".env")
        env_file_encoding = 'utf-8'


settings = Settings()

