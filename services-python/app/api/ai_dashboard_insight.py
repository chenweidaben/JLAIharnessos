# AI 看板洞察：当前规则 mock，生产接 vLLM + 异常检测模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()


class DashboardInsightRequest(BaseModel):
    metrics: List[dict]


@router.post("/ai/dashboard/insight")
async def dashboard_insight(req: DashboardInsightRequest):
    """
    AI 看板洞察（mock）。
    生产环境接 vLLM + 异常检测模型，输出异常/趋势/建议。
    """
    return {
        "anomalies": ["心内科门诊量突增30%，疑似流感季"],
        "trends": ["床位使用率连续3天>95%"],
        "recommendations": ["建议心内科增加号源", "考虑临时加床"]
    }
