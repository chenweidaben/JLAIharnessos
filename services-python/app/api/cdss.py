"""
健澜科技 jlmedaios AI 服务 - 临床决策支持（CDSS）API。

合规红线：
- 禁止境外大模型 API 调用
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class CdssSuggestRequest(BaseModel):
    """CDSS 建议请求体。"""
    symptom: str
    department: str


@router.post("/cdss/suggest")
async def cdss_suggest(req: CdssSuggestRequest):
    """
    临床决策支持 - 根据症状给出就诊建议。

    Mock 规则：
    - symptom 含"头痛"→ 建议神经内科就诊，考虑头颅CT
    - symptom 含"腹痛"→ 建议消化内科就诊，考虑腹部B超
    - 否则 → 建议全科门诊评估
    """
    if "头痛" in req.symptom:
        suggestion = "建议神经内科就诊，考虑头颅CT"
    elif "腹痛" in req.symptom:
        suggestion = "建议消化内科就诊，考虑腹部B超"
    else:
        suggestion = "建议全科门诊评估"

    return {
        "symptom": req.symptom,
        "suggestion": suggestion,
        "confidence": 0.85
    }
