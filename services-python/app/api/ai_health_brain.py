"""
健澜科技 jlmedaios - AI 健康大脑深化
Copyright (c) 杭州健澜科技有限公司
"""
from fastapi import APIRouter
from pydantic import BaseModel

# AI 健康大脑深化：全院 AI 能力概览 + 运营智能洞察，当前 mock 数据

router = APIRouter()


class InsightRequest(BaseModel):
    deptCode: str
    period: str


@router.get("/ai/brain/overview")
async def brain_overview():
    """
    全院 AI 能力概览（mock 数据）
    """
    return {
        "totalAiServices": 23,
        "dailyInferences": 15000,
        "adoptionRate": 0.72,
        "topServices": ["病历质控", "处方审核", "智能分诊"],
        "learningLoop": {
            "feedbackCollected": 5120,
            "modelsUpdated": 12,
            "accuracyImprovement": "+8.3%",
        },
    }


@router.post("/ai/brain/insight")
async def brain_insight(req: InsightRequest):
    """
    全院运营智能洞察（mock 数据）
    """
    return {
        "readmissionRisk": f"{req.deptCode} 再入院率偏高(12%)",
        "suggestedAction": "建议加强出院前健康教育+7天随访",
        "estimatedImpact": "再入院率降至8%，年节省约200万",
    }
