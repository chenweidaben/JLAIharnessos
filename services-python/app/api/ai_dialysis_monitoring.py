# AI 血透监护辅助：当前规则 mock，生产接 vLLM + 透析实时监测模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict

router = APIRouter()


class DialysisMonitoringRequest(BaseModel):
    dialysisData: Dict[str, object]


@router.post("/ai/dialysis/monitor")
async def dialysis_monitoring(req: DialysisMonitoringRequest):
    """
    AI 血透监护辅助（mock）。
    生产环境接 vLLM + 透析实时监测模型，输出状态/发现/警告/建议。
    """
    return {
        "status": "stable",
        "findings": ["脱水量达到目标值", "血压波动在正常范围"],
        "warning": "无",
        "suggestion": "按计划结束透析，记录干体重65.0kg"
    }
