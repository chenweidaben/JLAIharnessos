# AI 影像报告辅助：当前规则 mock，生产接 nnU-Net / 医学影像 AI 模型
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class ImagingReportRequest(BaseModel):
    modality: str
    findings: str


@router.post("/ai/imaging/report")
async def imaging_report(req: ImagingReportRequest):
    """
    AI 影像报告辅助（mock）。
    生产环境接 nnU-Net / 医学影像 AI 模型，输出建议印象/鉴别诊断/置信度/建议。
    """
    return {
        "modality": req.modality,
        "suggestedImpression": "右肺下叶炎症性病变",
        "differential": ["肺炎", "肺结核", "肺肿瘤"],
        "confidence": 0.82,
        "recommendation": "建议结合临床及实验室检查"
    }
