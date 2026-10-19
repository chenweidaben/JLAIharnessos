# AI 临床指南推荐：当前规则 mock，生产接 vLLM + 医学知识库
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()


class GuidelineRecommendRequest(BaseModel):
    diagnosis: str
    patientAge: int
    comorbidities: List[str]


@router.post("/ai/guideline/recommend")
async def guideline_recommend(req: GuidelineRecommendRequest):
    """
    AI 临床指南推荐（mock）。
    生产环境接 vLLM + 医学知识库，输出推荐指南/一线治疗/禁忌症/监测建议。
    """
    return {
        "diagnosis": req.diagnosis,
        "recommendedGuidelines": ["CDS指南2024", "ADA指南2024"],
        "firstLineTreatment": "二甲双胍 0.5g bid",
        "contraindications": ["肾功能不全需减量"],
        "monitoring": "每3个月复查HbA1c"
    }
