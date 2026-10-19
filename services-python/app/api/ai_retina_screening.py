# AI 眼底筛查：当前规则 mock，生产接 nnU-Net/眼底影像 AI 模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict

router = APIRouter()


class RetinaScreeningRequest(BaseModel):
    fundusImageFeatures: Dict[str, object]


@router.post("/ai/retina/screen")
async def retina_screen(req: RetinaScreeningRequest):
    """
    AI 眼底筛查（mock）。
    生产环境接 nnU-Net/眼底影像 AI 模型，输出糖网状态/病变/严重程度/建议/紧急度。
    """
    return {
        "drStatus": "referable",
        "lesions": ["微血管瘤", "出血点"],
        "severity": "中度非增殖期糖网",
        "recommendation": "内分泌科转诊+激光光凝评估",
        "urgency": "1个月内"
    }
