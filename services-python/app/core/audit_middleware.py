"""
健澜科技 jlmedaios AI 服务 - 审计日志中间件。

# 生产接 ELK / Loki，当前本地 JSONL 审计文件

合规红线：
- 记录所有 /ai/* 请求到本地审计文件（按日轮转，JSONL 格式）
- Bearer token 脱敏为 sk_x****
- 保留≥180天（由外部日志采集/清理策略执行，本服务按日落盘便于归档）
"""

import asyncio
import json
import time
from datetime import datetime
from pathlib import Path

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

AUDIT_DIR = Path("./data")


def _audit_file_for_today() -> Path:
    """按日轮转的审计文件路径：./data/audit-YYYYMMDD.jsonl"""
    return AUDIT_DIR / f"audit-{datetime.now():%Y%m%d}.jsonl"


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
    """
    追加一行 JSONL 到当日审计文件。

    P0 修复：原实现每请求「读全文件 → 解析 → 追加 → 整体重写」，存在：
    1. O(n) 全量重写，文件越大越慢；
    2. 并发请求 read-modify-write 竞态，互相覆盖丢日志；
    3. 文件无界增长。
    改为 append 模式单行写入：O(1)、POSIX 下 <PIPE_BUF 的写原子性、天然支持轮转。
    """
    path = _audit_file_for_today()
    path.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(entry, ensure_ascii=False)
    with open(path, "a", encoding="utf-8") as f:
        f.write(line + "\n")


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

        # 同步文件 I/O 放到线程池，避免阻塞事件循环
        try:
            await asyncio.to_thread(_write_audit, entry)
        except Exception:
            # 审计写盘失败不应中断业务响应
            pass

        return response
