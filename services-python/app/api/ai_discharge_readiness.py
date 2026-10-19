# AI 出院准备度评估：当前规则 mock，生产接 vLLM + 出院准备度量表
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter()


class DischargeReadinessRequest(BaseModel):
    patientId: str
    diagnosis: str
    labResults: Dict[str, float]
    medications: List[str]
    homeSupport: str


@router.post("/ai/discharge/readiness")
async def discharge_readiness(req: DischargeReadinessRequest):
    """
    AI 出院准备度评估（mock）。
    生产环境接 vLLM + 出院准备度量表，输出准备度评分/级别/差距/建议/随访计划。
    """
    readiness_score = 0.85
    gaps = []

    if req.homeSupport == "独居":
        readiness_score -= 0.1
        gaps.append("患者独居，需社区随访")

    if readiness_score >= 0.8:
        level = "ready"
    elif readiness_score >= 0.6:
        level = "conditional"
    else:
        level = "not_ready"

    recommendation = "可出院，建议7天后电话随访" if level == "ready" else "建议延迟出院"

    return {
        "readinessScore": round(readiness_score, 2),
        "readinessLevel": level,
        "gaps": gaps,
        "recommendation": recommendation,
        "followupPlan": {"contactMethod": "电话", "withinDays": 7}
    }
