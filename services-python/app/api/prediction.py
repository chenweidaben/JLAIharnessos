"""
健澜科技 jlmedaios AI 服务 - 预后预测。

# 预后预测：当前规则mock，生产接vLLM+临床预测模型

合规红线：
- 所有入参必须先过 sensitive.mask_phi 脱敏
- AI 推理预留 vLLM 本地调用，当前 mock
"""

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.sensitive import mask_phi

router = APIRouter()


class LosPredictionRequest(BaseModel):
    """住院时长预测请求体。"""
    age: int
    mainDiagnosis: str
    comorbidities: list
    surgery: bool


class ReadmissionPredictionRequest(BaseModel):
    """再入院预测请求体。"""
    age: int
    mainDiagnosis: str
    comorbidities: list
    dischargeDate: str


@router.post("/ai/prediction/los")
async def predict_los(req: LosPredictionRequest):
    """
    住院时长预测。

    Mock 规则：年龄≥65 → riskFactors 含"高龄"，基础 LOS=5.2
    """
    # 合规红线：主诊断先过脱敏
    masked_diagnosis = mask_phi(req.mainDiagnosis)

    risk_factors = []
    if req.age >= 65:
        risk_factors.append("高龄")
    if req.comorbidities:
        risk_factors.append("并发症")
    if not risk_factors:
        risk_factors.append("无")

    return {
        "predictedLOS": 5.2,
        "unit": "days",
        "confidence": 0.78,
        "riskFactors": risk_factors
    }


@router.post("/ai/prediction/readmission")
async def predict_readmission(req: ReadmissionPredictionRequest):
    """
    再入院风险预测。

    Mock 规则：基础 risk=0.12 low，factors 含"心衰"、"未戒烟"
    """
    # 合规红线：主诊断先过脱敏
    masked_diagnosis = mask_phi(req.mainDiagnosis)

    return {
        "risk": 0.12,
        "level": "low",
        "factors": ["心衰", "未戒烟"]
    }
