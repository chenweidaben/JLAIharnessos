# ============================================================
# 健澜科技 jlmedaios Python AI 服务 - Dockerfile
# Python 3.11 + FastAPI
# ============================================================

FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
