# AI 流程优化建议：当前规则 mock，生产接 vLLM + 流程挖掘模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()


class WorkflowOptimizeRequest(BaseModel):
    workflowType: str
    currentBottlenecks: List[str]


@router.post("/ai/workflow/optimize")
async def workflow_optimize(req: WorkflowOptimizeRequest):
    """
    AI 流程优化建议（mock）。
    生产环境接 vLLM + 流程挖掘模型，输出瓶颈/建议/预期改善。
    """
    return {
        "workflowType": req.workflowType,
        "bottlenecks": req.currentBottlenecks,
        "recommendations": ["推广线上预约", "增加自助机"],
        "expectedImprovement": {"waitTimeReduction": "-40%", "satisfactionIncrease": "+8%"}
    }
