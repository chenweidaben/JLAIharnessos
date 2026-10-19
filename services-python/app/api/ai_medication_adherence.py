"""
健澜科技 jlmedaios - 用药依从性分析
Copyright (c) 杭州健澜科技有限公司
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field

# 用药依从性分析：当前规则 mock，生产接 refill 数据 + ML 模型

router = APIRouter()


class MedicationAdherenceRequest(BaseModel):
    patientId: str
    medications: list = Field(default_factory=list)
    refillHistory: list = Field(default_factory=list)


@router.post("/ai/medication/adherence")
async def medication_adherence(req: MedicationAdherenceRequest):
    """
    用药依从性分析（mock 规则）
    当前返回固定示例，生产接 refill 数据 + ML 模型
    """
    # mock 规则：根据 medications 数量判断
    med_count = len(req.medications)
    if med_count >= 3:
        adherence_score = 0.65
        risk_level = "medium"
        issues = ["二甲双胍 refill间隔>30天", "阿司匹林连续2次未续方"]
        intervention = "建议药师电话随访"
    elif med_count >= 1:
        adherence_score = 0.80
        risk_level = "low"
        issues = []
        intervention = "定期复诊即可"
    else:
        adherence_score = 1.0
        risk_level = "low"
        issues = []
        intervention = "无需干预"

    return {
        "adherenceScore": adherence_score,
        "riskLevel": risk_level,
        "issues": issues,
        "intervention": intervention,
    }
