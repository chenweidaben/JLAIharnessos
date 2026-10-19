# AI 手术风险评估：当前规则 mock，生产接临床风险预测模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter()


class SurgeryRiskRequest(BaseModel):
    age: int
    comorbidities: List[str]
    surgeryType: str
    labResults: Dict[str, float]


@router.post("/ai/surgery/risk")
async def surgery_risk(req: SurgeryRiskRequest):
    """
    AI 手术风险评估（mock）。
    生产环境接临床风险预测模型，输出风险评分/风险等级/风险因素/建议。
    """
    risk_score = 0.0
    risk_factors = []

    if req.age >= 65:
        risk_score += 0.05
        risk_factors.append("年龄>60岁")

    if "高血压" in req.comorbidities:
        risk_score += 0.05
        risk_factors.append("高血压II级")

    if risk_score < 0.1:
        risk_level = "low"
    elif risk_score < 0.2:
        risk_level = "medium"
    else:
        risk_level = "high"

    return {
        "surgeryType": req.surgeryType,
        "riskScore": round(risk_score, 2),
        "riskLevel": risk_level,
        "riskFactors": risk_factors,
        "recommendation": "术前控制血压，术中密切监测"
    }
