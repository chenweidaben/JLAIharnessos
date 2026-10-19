# AI 急诊分诊辅助：当前规则 mock，生产接 vLLM + 急诊分诊模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict

router = APIRouter()


class ERTriageRequest(BaseModel):
    chiefComplaint: str
    vitalSigns: Dict[str, object]


@router.post("/ai/er/triage")
async def er_triage(req: ERTriageRequest):
    """
    AI 急诊分诊辅助（mock）。
    生产环境接 vLLM + 急诊分诊模型，输出分诊级别/理由/建议处置/等待时限。
    """
    return {
        "triageLevel": "Ⅱ",
        "reason": "胸痛+血压180/110mmHg，需立即处理",
        "recommendedAction": "立即心电图+心内科急会诊",
        "waitTimeLimit": "10分钟内"
    }
