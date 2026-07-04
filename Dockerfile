# syntax=docker/dockerfile:1

# ---- Stage 1: build the React frontend ----
FROM node:20-alpine AS frontend
WORKDIR /build/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
# Vite's build.outDir is "../placementos/static_react", so the build lands at
# /build/placementos/static_react
RUN npm run build

# ---- Stage 2: Python runtime serving the API + the built frontend ----
FROM python:3.12-slim AS runtime
WORKDIR /app

# Install Python deps first for better layer caching
COPY placementos/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Application code (main.py, routers/, services/, data/, ...)
COPY placementos/ ./

# The frontend built in stage 1, served by FastAPI's SPA fallback
COPY --from=frontend /build/placementos/static_react ./static_react

# Render (and most PaaS) inject $PORT; default to 8000 for local runs
ENV PORT=8000
EXPOSE 8000
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
