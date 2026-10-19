# AI 康复计划辅助：当前规则 mock，生产接 vLLM + 康复医学 NLP 生成模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict

router = APIRouter()


class RehabPlanRequest(BaseModel):
    patientCondition: Dict[str, object]


@router.post("/ai/rehab/plan")
async def rehab_plan(req: RehabPlanRequest):
    """
    AI 康复计划辅助（mock）。
    生产环境接 vLLM + 康复医学 NLP 生成模型，输出康复类型/阶段/每周次数/疗程/预期效果。
    """
    return {
        "rehabType": "脑卒中后康复",
        "phases": ["急性期：床上良肢位摆放", "恢复期：坐位平衡训练", "后遗症期：社区康复"],
        "weeklySession": 5,
        "durationWeeks": 12,
        "expectedOutcome": "Fugl-Meyer评分提高20分"
    }
