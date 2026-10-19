"""
健澜科技 jlmedaios - 患者风险评分
Copyright (c) 杭州健澜科技有限公司
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field

# 患者风险评分：当前规则 mock，生产接 ML 风险预测模型

router = APIRouter()


class ReadmissionRiskRequest(BaseModel):
    age: int
    comorbidities: list = Field(default_factory=list)
    labValues: dict = Field(default_factory=dict)
    dischargeSummary: str


@router.post("/ai/risk/readmission")
async def readmission_risk(req: ReadmissionRiskRequest):
    """
    再入院风险评分（mock 规则）
    当前返回固定示例，生产接 ML 风险预测模型
    """
    risk_score = 0.0
    top_risk_factors = []

    # 规则 1：年龄 >=75
    if req.age >= 75:
        risk_score += 0.15
        top_risk_factors.append("年龄>75岁")

    # 规则 2：合并症含心衰
    if "心衰" in req.comorbidities:
        risk_score += 0.10
        top_risk_factors.append("心衰病史")

    # 规则 3：肌酐 >120
    creatinine = req.labValues.get("肌酐", 0)
    if creatinine > 120:
        risk_score += 0.10
        top_risk_factors.append("肌酐偏高")

    # 风险等级判定
    if risk_score >= 0.3:
        risk_level = "high"
        recommendation = "建议出院后3天内门诊随访，密切监测"
    elif risk_score >= 0.15:
        risk_level = "medium"
        recommendation = "建议出院后7天内门诊随访"
    else:
        risk_level = "low"
        recommendation = "常规出院随访即可"

    return {
        "readmissionRiskScore": round(risk_score, 2),
        "riskLevel": risk_level,
        "topRiskFactors": top_risk_factors,
        "recommendation": recommendation,
    }
