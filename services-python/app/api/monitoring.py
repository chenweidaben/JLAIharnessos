"""
健澜科技 jlmedaios - AI 服务健康检查和指标
Copyright (c) 杭州健澜科技有限公司
"""
from fastapi import APIRouter
from fastapi.responses import PlainTextResponse

# AI 服务健康检查和指标：生产接 Prometheus

router = APIRouter()


@router.get("/ai/health")
async def ai_health():
    """
    AI 服务健康检查（mock）
    当前返回固定示例，生产接真实 vLLM 连接状态
    """
    return {
        "status": "UP",
        "vllm_status": "connected",
        "loaded_models": ["qwen2.5-72b"],
        "memory_usage": "12GB",
        "total_requests": 1024,
    }


@router.get("/ai/metrics", response_class=PlainTextResponse)
async def ai_metrics():
    """
    Prometheus 格式指标（mock）
    当前返回固定文本，生产接 Prometheus client
    """
    return """# HELP ai_requests_total Total AI requests
# TYPE ai_requests_total counter
ai_requests_total 1024
# HELP ai_latency_seconds Request latency
# TYPE ai_latency_seconds histogram
ai_latency_seconds_bucket{le="0.1"} 200
ai_latency_seconds_bucket{le="0.5"} 800
ai_latency_seconds_bucket{le="1.0"} 950
ai_latency_seconds_count 1024
"""
