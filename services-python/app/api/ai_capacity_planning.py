# AI 容量规划：当前规则 mock，生产接 vLLM + 容量预测模型
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class CapacityPlanRequest(BaseModel):
    currentQPS: int
    peakQPS: int
    avgResponseMs: int
    growthRate: float


@router.post("/ai/capacity/plan")
async def capacity_plan(req: CapacityPlanRequest):
    """
    AI 容量规划（mock）。
    生产环境接 vLLM + 容量预测模型，输出当前/预测QPS、瓶颈、推荐实例数、预估成本、时间线。
    """
    return {
        "currentQPS": req.currentQPS,
        "projectedQPS": int(req.currentQPS * (1 + req.growthRate)),
        "bottleneck": "数据库连接池",
        "recommendedInstances": {"monolith": 2, "aiService": 3},
        "estimatedMonthlyCost": "约2.5万元",
        "timeline": "建议3个月内完成扩容"
    }
