# AI 影像报告辅助：当前规则 mock，生产接 nnU-Net/医学影像 AI 模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict

router = APIRouter()


class RadiologyReportRequest(BaseModel):
    studyData: Dict[str, object]


@router.post("/ai/radiology/report")
async def radiology_report(req: RadiologyReportRequest):
    """
    AI 影像报告辅助（mock）。
    生产环境接 nnU-Net/医学影像 AI 模型，输出影像类型/发现/印象/建议/置信度。
    """
    return {
        "modality": "胸部CT",
        "findings": "双肺纹理清晰，左肺下叶见结节影，大小约8mm",
        "impression": "左肺下叶结节，建议随访",
        "suggestion": "3个月后复查胸部CT",
        "confidence": 0.88
    }
