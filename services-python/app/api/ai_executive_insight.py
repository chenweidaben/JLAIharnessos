# AI 院长洞察：当前规则 mock，生产接 vLLM + 管理驾驶舱大数据分析
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()


class ExecutiveInsightRequest(BaseModel):
    kpis: List[dict]


@router.post("/ai/executive/insight")
async def executive_insight(req: ExecutiveInsightRequest):
    """
    AI 院长洞察（mock）。
    生产环境接 vLLM + 管理驾驶舱大数据分析，输出总结/关键发现/风险/建议。
    """
    return {
        "summary": "本月门诊量同比+8%，但心内科药占比超标5个百分点",
        "keyFindings": ["手术量环比+12%", "平均住院日下降0.8天"],
        "risks": ["医保拒付率上升至3.2%"],
        "recommendation": "建议心内科优化用药结构，重点关注DRG付费病例"
    }
