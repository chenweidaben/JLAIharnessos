# AI ICU 监护辅助：当前规则 mock，生产接 vLLM + ICU 实时监测模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict

router = APIRouter()


class ICUMonitoringRequest(BaseModel):
    icuData: Dict[str, object]


@router.post("/ai/icu/monitor")
async def icu_monitoring(req: ICUMonitoringRequest):
    """
    AI ICU 监护辅助（mock）。
    生产环境接 vLLM + ICU 实时监测模型，输出患者状态/警告/建议/风险评分/复评建议。
    """
    return {
        "patientStatus": "unstable",
        "warnings": ["血压进行性下降", "心率>120次/分"],
        "suggestion": "评估是否需要加大多巴胺剂量，复查血气",
        "riskScore": 0.78,
        "recommendation": "建议30分钟内复评"
    }
