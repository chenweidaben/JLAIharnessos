# AI 听力筛查：当前规则 mock，生产接 vLLM + 听力检测分析模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict

router = APIRouter()


class HearingScreeningRequest(BaseModel):
    audiogramData: Dict[str, object]


@router.post("/ai/hearing/screen")
async def hearing_screen(req: HearingScreeningRequest):
    """
    AI 听力筛查（mock）。
    生产环境接 vLLM + 听力检测分析模型，输出听力损失程度/各频率值/建议/紧急度。
    """
    return {
        "hearingLevel": "轻度感音神经性听力损失",
        "frequencies": {"250Hz": 25, "500Hz": 30, "1kHz": 35, "2kHz": 40},
        "recommendation": "建议耳鼻喉科就诊，考虑助听器评估",
        "urgency": "2周内"
    }
