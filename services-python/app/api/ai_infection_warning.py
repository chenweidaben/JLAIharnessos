# AI 院感预警：当前规则 mock，生产接 vLLM + 院感监测模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter()


class InfectionWarningRequest(BaseModel):
    department: str
    patientVitals: List[Dict]
    labResults: Dict[str, float]


@router.post("/ai/infection/warning")
async def infection_warning(req: InfectionWarningRequest):
    """
    AI 院感预警（mock）。
    生产环境接 vLLM + 院感监测模型，输出预警级别/风险因素/建议/预测感染类型。
    """
    risk_factors = []
    warning_level = "low"
    predicted_type = "无"

    temperature = req.labResults.get("temperature", 36.5)
    wbc = req.labResults.get("wbc", 6.0)

    if temperature > 38.5:
        risk_factors.append(f"术后发热>38.5℃")
        warning_level = "medium"

    if wbc > 12:
        risk_factors.append(f"白细胞升高")
        predicted_type = "手术部位感染"

    suggestion = "建议完善血培养，监测切口" if warning_level == "medium" else "常规监测"

    return {
        "warningLevel": warning_level,
        "riskFactors": risk_factors,
        "suggestion": suggestion,
        "predictedInfectionType": predicted_type
    }
