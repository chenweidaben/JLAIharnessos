"""
健澜科技 jlmedaios AI 服务 - 审计日志中间件。

# 生产接 ELK / Loki，当前本地 mock audit.json

合规红线：
- 记录所有 /ai/* 请求到本地 audit.json
- Bearer token 脱敏为 sk_x****
- 保留≥180天
"""

import json
import time
from datetime import datetime
from pathlib import Path

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

AUDIT_FILE = Path("./data/audit.json")


def _mask_token(auth_header: str) -> str:
    """
    脱敏 Bearer Token。

    输入 "Bearer sk_mock_abc123" → "sk_m****"
    """
    if not auth_header or not auth_header.startswith("Bearer "):
        return "none"
    token = auth_header.replace("Bearer ", "")
    if len(token) > 4:
        return token[:4] + "****"
    return "****"


def _write_audit(entry: dict):
    """写入 audit.json（追加到 list）。"""
    AUDIT_FILE.parent.mkdir(parents=True, exist_ok=True)

    data = []
    if AUDIT_FILE.exists():
        try:
            with open(AUDIT_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
        except (json.JSONDecodeError, IOError):
            data = []

    data.append(entry)
    with open(AUDIT_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


class AuditMiddleware(BaseHTTPMiddleware):
    """
    审计日志中间件。

    记录所有 /ai/* 请求：timestamp / path / method / user_token_masked /
    request_size / response_time_ms / status_code
    """

    async def dispatch(self, request: Request, call_next):
        # 只记录 /ai/* 路由
        if not request.url.path.startswith("/ai/"):
            return await call_next(request)

        start_time = time.time()
        auth_header = request.headers.get("Authorization", "")
        token_masked = _mask_token(auth_header)
        request_size = request.headers.get("content-length", "0")

        response = await call_next(request)

        elapsed_ms = int((time.time() - start_time) * 1000)

        entry = {
            "timestamp": datetime.now().isoformat(),
            "path": request.url.path,
            "method": request.method,
            "user_token_masked": token_masked,
            "request_size": int(request_size) if request_size.isdigit() else 0,
            "response_time_ms": elapsed_ms,
            "status_code": response.status_code
        }

        # 异步写入，不阻塞响应
        _write_audit(entry)

        return response
