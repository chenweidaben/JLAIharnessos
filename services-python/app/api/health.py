"""
健澜科技 jlmedaios AI 服务 - 健康检查 API。
"""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    健康检查接口。

    Returns:
        dict: 服务状态信息
    """
    return {
        "status": "up",
        "service": "jlmedaios-ai",
        "model": "local-vllm"
    }
