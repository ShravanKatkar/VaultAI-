import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    OLLAMA_BASE_URL: str = Field(default="http://localhost:11434")
    CHROMA_PATH: str = Field(default="./chroma_db")
    EMBED_MODEL: str = Field(default="nomic-embed-text")
    LLM_MODEL: str = Field(default="llama3-8b-8192")
    USE_GROQ: bool = Field(default=False)
    GROQ_API_KEY: str = Field(default="")
    CORS_ALLOWED_ORIGINS: str = Field(default="http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173,https://vault-ai-gamma.vercel.app")

    class Config:
        # Load from .env at current working dir or parent
        env_file = os.getenv("ENV_FILE", ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
