# Use Python 3.11 slim image as base
# Slim version is smaller and faster to download
FROM python:3.11-slim

# Set working directory inside the container
# All commands will run from this directory
WORKDIR /app

# Install system dependencies
# psycopg2 needs these to connect to PostgreSQL
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file first
# This is done separately to leverage Docker layer caching
# If requirements don't change, this layer is reused
COPY requirements.txt .

# Install Python dependencies
# --no-cache-dir reduces image size
RUN pip install --no-cache-dir -r requirements.txt

# Copy the entire application code
# This includes app/, ai_engine/, etc.
COPY . .

# Expose port 8000
# This tells Docker that the container listens on port 8000
# (doesn't actually publish the port, that's done in docker-compose.yml)
EXPOSE 8000

# Command to run the application
# --host 0.0.0.0 makes it accessible from outside the container
# --reload enables auto-reload when code changes (for development)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
