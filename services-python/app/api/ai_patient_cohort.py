# AI 患者队列分析：当前规则 mock，生产接 vLLM + 队列分析模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()


class CohortAnalyzeRequest(BaseModel):
    filters: List[dict]


@router.post("/ai/cohort/analyze")
async def cohort_analyze(req: CohortAnalyzeRequest):
    """
    AI 患者队列分析（mock）。
    生产环境接 vLLM + 队列分析模型，输出队列规模/人口学/常见诊断/结局趋势/建议。
    """
    return {
        "cohortSize": 1250,
        "demographics": {"age": "65±12", "gender": "男55%女45%"},
        "commonDiagnoses": ["高血压", "糖尿病", "冠心病"],
        "outcomeTrends": {"再入院率": "18%", "平均住院日": "8.5天"},
        "suggestion": "建议针对糖尿病合并冠心病患者加强出院随访"
    }
