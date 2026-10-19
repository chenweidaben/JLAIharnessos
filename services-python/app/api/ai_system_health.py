# AI 系统健康诊断：当前规则 mock，生产接 vLLM + AIOps 异常检测模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()


class SystemHealthRequest(BaseModel):
    metrics: List[dict]


@router.post("/ai/system/health")
async def system_health(req: SystemHealthRequest):
    """
    AI 系统健康诊断（mock）。
    生产环境接 vLLM + AIOps 异常检测模型，输出整体健康状态/问题/根因/建议。
    """
    return {
        "overallHealth": "warning",
        "issues": ["AI服务P99延迟从200ms升至800ms"],
        "rootCause": "vLLM GPU显存接近满载",
        "recommendation": "建议扩容H20显卡或降低batch size"
    }
