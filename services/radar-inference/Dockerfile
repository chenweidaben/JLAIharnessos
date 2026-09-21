# syntax=docker/dockerfile:1
# =============================================================================
# RADAR-Fusion inference service (DAMO-RADAR abdominal CT).
#
# Two flavours are documented here:
#   (A) CPU / demo  -> default build (no weights, deterministic pre-computed CSV)
#   (B) GPU / prod  -> uncomment the GPU stage block, mount ./models/radar,
#                      download weights out-of-band (see download_weights.sh).
#
# Copyright (c) 2026 杭州健澜科技有限公司. All rights reserved.
# =============================================================================

# -----------------------------------------------------------------------------
# (A) CPU / DEMO image (default)
# -----------------------------------------------------------------------------
FROM python:3.11-slim AS demo
WORKDIR /service

# Minimal runtime deps only (no torch/monai)
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app
COPY vendor ./vendor
COPY app/data ./app/data

# Weights are NEVER baked into the image; they are volume-mounted.
# ./models/radar/ is expected to be mounted at runtime when switching to prod.
ENV RADAR_PORT=8090 \
    RADAR_MAX_CONCURRENCY=2 \
    PYTHONUNBUFFERED=1

EXPOSE 8090
# Run in demo/degraded mode until weights are mounted + prod deps installed.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8090"]

# -----------------------------------------------------------------------------
# (B) GPU / PRODUCTION image (uncomment to build; requires NVIDIA runtime)
# -----------------------------------------------------------------------------
# FROM nvidia/cuda:12.1.0-cudnn8-runtime-ubuntu22.04 AS prod
# WORKDIR /service
# RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pip \
#     && rm -rf /var/lib/apt/lists/*
# COPY requirements.txt requirements-prod.txt ./
# RUN pip install --no-cache-dir -r requirements.txt -r requirements-prod.txt
# COPY app ./app
# COPY vendor ./vendor
# COPY app/data ./app/data
# ENV RADAR_PORT=8090 RADAR_MAX_CONCURRENCY=2
# EXPOSE 8090
# # Mount ./models/radar:/models/radar and download weights via download_weights.sh.
# CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8090"]
