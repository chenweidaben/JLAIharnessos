# AI 病历质控：当前规则 mock，生产接 vLLM + NLP 病历审核模型
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class MRQCAnalyzeRequest(BaseModel):
    medicalRecordText: str


@router.post("/ai/mrqc/analyze")
async def mrqc_analyze(req: MRQCAnalyzeRequest):
    """
    AI 病历质控（mock）。
    生产环境接 vLLM + NLP 病历审核模型，输出评分/问题/建议/风险等级。
    """
    return {
        "score": 85,
        "issues": ["主诉与现病史不对应", "缺少过敏史记录"],
        "suggestions": ["补充过敏史"],
        "riskLevel": "medium"
    }
