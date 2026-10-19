# AI 数据隐私检测：当前规则 mock，生产接 vLLM + NLP PII 识别模型
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class PrivacyScanRequest(BaseModel):
    dataSample: dict


@router.post("/ai/privacy/scan")
async def privacy_scan(req: PrivacyScanRequest):
    """
    AI 数据隐私检测（mock）。
    生产环境接 vLLM + NLP PII 识别模型，输出 PHI 检测字段/风险等级/脱敏建议。
    """
    return {
        "phiDetected": True,
        "fields": [
            {"field": "patientName", "type": "姓名", "risk": "high"},
            {"field": "idCard", "type": "身份证", "risk": "critical"},
            {"field": "phone", "type": "手机号", "risk": "high"}
        ],
        "suggestion": "建议脱敏后再用于AI训练",
        "maskingMethod": {"patientName": "张*三", "idCard": "330***********1234"}
    }
