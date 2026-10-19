# AI 口腔辅助诊断：当前规则 mock，生产接 vLLM + 口腔影像 AI 模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict

router = APIRouter()


class DentalDiagnosisRequest(BaseModel):
    oralExamData: Dict[str, object]


@router.post("/ai/dental/diagnose")
async def dental_diagnose(req: DentalDiagnosisRequest):
    """
    AI 口腔辅助诊断（mock）。
    生产环境接 vLLM + 口腔影像 AI 模型，输出发现/诊断/治疗计划/费用估算/紧急度。
    """
    return {
        "findings": ["36号牙合面龋坏", "牙龈炎"],
        "diagnosis": "深龋+慢性龈炎",
        "treatmentPlan": ["36号牙充填治疗", "全口洁治"],
        "costEstimate": "约800-1200元",
        "urgency": "2周内"
    }
