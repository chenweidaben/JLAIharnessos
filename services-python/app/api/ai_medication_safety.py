# AI 用药安全审查：当前规则 mock，生产接 vLLM + 药品相互作用数据库
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter()


class MedicationSafetyRequest(BaseModel):
    patientId: str
    medications: List[str]
    labValues: Dict[str, float]


@router.post("/ai/medication/safety")
async def medication_safety(req: MedicationSafetyRequest):
    """
    AI 用药安全审查（mock）。
    生产环境接 vLLM + 药品相互作用数据库，输出预警列表/建议/监测要求。
    """
    return {
        "alerts": [
            {"drug": "华法林+阿司匹林", "risk": "出血风险增加3倍", "severity": "high"},
            {"drug": "二甲双胍", "warning": "eGFR<30需停用", "severity": "medium"}
        ],
        "recommendation": "建议停用阿司匹林，改用氯吡格雷",
        "monitoring": "用药后3天复查INR"
    }
