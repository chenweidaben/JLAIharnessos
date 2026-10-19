"""
健澜科技 jlmedaios - 医疗质量 AI 洞察
Copyright (c) 杭州健澜科技有限公司
"""
from fastapi import APIRouter
from pydantic import BaseModel

# 医疗质量AI洞察：当前规则 mock，生产接实时质量数据聚合

router = APIRouter()


class QualityInsightRequest(BaseModel):
    deptCode: str
    period: str


@router.post("/ai/quality/insight")
async def quality_insight(req: QualityInsightRequest):
    """
    科室质量洞察（mock）
    当前返回固定示例，生产接实时质量数据聚合
    """
    return {
        "readmissionRate": 0.08,
        "readmissionTrend": "up",
        "topRiskFactors": ["高龄", "并发症多"],
        "suggestion": "建议加强出院前健康教育",
    }


@router.get("/ai/quality/high-risk-patients")
async def high_risk_patients():
    """
    高风险患者预警列表（mock）
    当前返回固定示例，生产接实时风险模型
    """
    return [
        {"patientId": "P001", "riskLevel": "high", "reason": "术后第3天发热"},
        {"patientId": "P002", "riskLevel": "medium", "reason": "血糖控制不佳"},
    ]
