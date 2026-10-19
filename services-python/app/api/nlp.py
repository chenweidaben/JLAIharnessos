"""
健澜科技 jlmedaios AI 服务 - NLP 自然语言处理 API。

合规红线：
- 所有入参必须先过 sensitive.mask_phi 脱敏
- 禁止境外大模型 API 调用
"""

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.sensitive import mask_phi

router = APIRouter()


class MedicalCorrectionRequest(BaseModel):
    """医疗纠错请求体。"""
    text: str


class MedicalNormalizeRequest(BaseModel):
    """医学术语标准化请求体。"""
    spoken: str


@router.post("/nlp/medical-correction")
async def medical_correction(req: MedicalCorrectionRequest):
    """
    医疗文本纠错。

    合规红线：入参先过 mask_phi 脱敏后再处理。

    Mock 规则：
    - 包含"咳素"→ correction="咳嗽"
    - 包含"发烧"→ correction="发热"
    - 否则 correction=原文
    """
    # 合规红线：所有入参必须先过脱敏
    masked_text = mask_phi(req.text)

    if "咳素" in masked_text:
        corrected = masked_text.replace("咳素", "咳嗽")
    elif "发烧" in masked_text:
        corrected = masked_text.replace("发烧", "发热")
    else:
        corrected = masked_text

    return {
        "original": req.text,
        "corrected": corrected
    }


@router.post("/nlp/medical-normalize")
async def medical_normalize(req: MedicalNormalizeRequest):
    """
    口语化医学术语标准化。

    合规红线：入参先过 mask_phi 脱敏后再处理。

    Mock 规则：
    - 包含"拉肚子"→ normalize="腹泻"
    - 包含"心里不舒服"→ normalize="心悸待查"
    - 否则 normalize=原文
    """
    # 合规红线：所有入参必须先过脱敏
    masked_spoken = mask_phi(req.spoken)

    if "拉肚子" in masked_spoken:
        normalized = masked_spoken.replace("拉肚子", "腹泻")
    elif "心里不舒服" in masked_spoken:
        normalized = masked_spoken.replace("心里不舒服", "心悸待查")
    else:
        normalized = masked_spoken

    return {
        "spoken": req.spoken,
        "normalized": normalized
    }
