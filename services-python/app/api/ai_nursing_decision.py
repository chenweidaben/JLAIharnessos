# AI 护理决策：当前规则 mock，生产接 vLLM + 护理评估量表
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict

router = APIRouter()


class NursingAssessRequest(BaseModel):
    patientId: str
    age: int
    diagnosis: str
    labValues: Dict[str, float]
    vitalSigns: Dict[str, float]


@router.post("/ai/nursing/assess")
async def nursing_assess(req: NursingAssessRequest):
    """
    AI 护理决策（mock）。
    生产环境接 vLLM + 护理评估量表，输出跌倒风险/压疮风险/推荐护理任务/警示。
    """
    fall_score = 20
    fall_level = "low"

    if req.age >= 75:
        fall_score += 15
        fall_level = "medium"

    pressure_score = 10
    pressure_level = "low"

    albumin = req.labValues.get("albumin", 40)
    if albumin < 30:
        pressure_score += 10
        pressure_level = "medium"

    recommended_tasks = []
    if pressure_level == "medium":
        recommended_tasks.append("每2小时翻身")
    if fall_level == "medium":
        recommended_tasks.append("床栏拉起")

    return {
        "fallRisk": {"level": fall_level, "score": fall_score},
        "pressureUlcerRisk": {"level": pressure_level, "score": pressure_score},
        "recommendedTasks": recommended_tasks,
        "warning": "患者口服利尿剂，注意观察尿量"
    }
