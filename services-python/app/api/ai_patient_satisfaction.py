# AI 满意度情感分析：当前规则 mock，生产接 vLLM + NLP 情感模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()


class SatisfactionAnalyzeRequest(BaseModel):
    comments: List[str]


@router.post("/ai/satisfaction/analyze")
async def analyze_satisfaction(req: SatisfactionAnalyzeRequest):
    """
    AI 满意度情感分析（mock）。
    生产环境接 vLLM + NLP 情感模型，输出正面/中性/负面分类 + 问题聚类 + 改进建议。
    """
    total = len(req.comments)
    return {
        "totalComments": total,
        "positive": int(total * 0.72),
        "neutral": int(total * 0.20),
        "negative": int(total * 0.08),
        "topIssues": ["挂号等待时间长", "住院部卫生间不干净"],
        "suggestion": "建议优化挂号流程，预计满意度可提升5%"
    }
