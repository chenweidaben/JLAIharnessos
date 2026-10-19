# AI 收入预测：当前规则 mock，生产接 vLLM + Prophet 时序模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()


class RevenueForecastRequest(BaseModel):
    historicalData: List[dict]


@router.post("/ai/revenue/forecast")
async def revenue_forecast(req: RevenueForecastRequest):
    """
    AI 收入预测（mock）。
    生产环境接 vLLM + Prophet 时序模型，输出下月收入/增长率/驱动因素/风险/置信度。
    """
    return {
        "nextMonthRevenue": "约2.3亿元",
        "growthRate": "环比+5.2%",
        "drivers": ["门诊量增长8%", "DRG支付改革影响"],
        "risk": ["药品集采降价预计影响200万"],
        "confidence": 0.85
    }
