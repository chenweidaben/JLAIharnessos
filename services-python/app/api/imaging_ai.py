"""
健澜科技 jlmedaios AI 服务 - 医学影像辅助诊断。

# 影像辅助诊断：当前规则mock，生产接PACS+影像AI模型（如nnU-Net）

合规红线：
- 所有入参必须先过 sensitive.mask_phi 脱敏
- AI 推理预留 vLLM 本地调用，当前 mock
"""

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.sensitive import mask_phi

router = APIRouter()


class ImagingReportRequest(BaseModel):
    """影像报告请求体。"""
    studyType: str
    findings: str


@router.post("/ai/imaging/report")
async def generate_imaging_report(req: ImagingReportRequest):
    """
    影像辅助诊断报告生成。

    Mock 规则：
    - CT + 磨玻璃影 → 肺部磨玻璃结节，建议3个月复查+增强扫描
    - 超声 + 结节 → 乳腺结节BI-RADS 3类，建议6个月随访
    - 否则 → 未见明显异常
    """
    # 合规红线：所有入参必须先过脱敏
    masked_findings = mask_phi(req.findings)

    if req.studyType == "CT" and "磨玻璃影" in masked_findings:
        return {
            "studyType": req.studyType,
            "impression": "肺部磨玻璃结节",
            "suggestions": ["建议3个月复查", "建议增强扫描"],
            "aiFlag": True,
            "confidence": 0.85
        }
    elif req.studyType == "超声" and "结节" in masked_findings:
        return {
            "studyType": req.studyType,
            "impression": "乳腺结节BI-RADS 3类",
            "suggestions": ["建议6个月随访"],
            "aiFlag": True,
            "confidence": 0.82
        }
    else:
        return {
            "studyType": req.studyType,
            "impression": "未见明显异常",
            "suggestions": [],
            "aiFlag": False,
            "confidence": 0.9
        }
