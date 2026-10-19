"""
健澜科技 jlmedaios AI 服务 - 智能导诊预问诊 AI。

合规红线：
- 所有入参必须先过 sensitive.mask_phi 脱敏
- AI 推理预留 vLLM 本地调用，当前 mock
"""

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.sensitive import mask_phi

router = APIRouter()


class SymptomRequest(BaseModel):
    """症状描述请求体。"""
    description: str


class EmergencyRequest(BaseModel):
    """急症判断请求体。"""
    description: str


@router.post("/ai/triage/symptom")
async def symptom_triage(req: SymptomRequest):
    """
    症状智能导诊。

    Mock 规则：
    - 含"胸痛"→ 急诊(0.95) + 心内科(0.85)
    - 含"肚子疼"→ 消化内科(0.9) + 普外科(0.7)
    - 含"发烧"→ 发热门诊(0.95)
    - 否则 → 全科门诊(0.5)
    """
    # 合规红线：所有入参必须先过脱敏
    masked_desc = mask_phi(req.description)

    if "胸痛" in masked_desc:
        recommendations = [
            {"dept": "急诊", "confidence": 0.95},
            {"dept": "心内科", "confidence": 0.85}
        ]
    elif "肚子疼" in masked_desc:
        recommendations = [
            {"dept": "消化内科", "confidence": 0.9},
            {"dept": "普外科", "confidence": 0.7}
        ]
    elif "发烧" in masked_desc:
        recommendations = [
            {"dept": "发热门诊", "confidence": 0.95}
        ]
    else:
        recommendations = [
            {"dept": "全科门诊", "confidence": 0.5}
        ]

    return {
        "description": req.description,
        "recommendations": recommendations
    }


@router.post("/ai/triage/emergency")
async def emergency_check(req: EmergencyRequest):
    """
    急症判断。

    Mock 规则：
    - 含"胸痛"/"呼吸困难"/"大出血"/"意识障碍"→ isEmergency=true
    - 否则 → isEmergency=false
    """
    # 合规红线：所有入参必须先过脱敏
    masked_desc = mask_phi(req.description)

    emergency_keywords = ["胸痛", "呼吸困难", "大出血", "意识障碍"]
    is_emergency = any(kw in masked_desc for kw in emergency_keywords)

    if is_emergency:
        return {
            "isEmergency": True,
            "advice": "立即前往急诊"
        }
    else:
        return {
            "isEmergency": False,
            "advice": "建议门诊就诊"
        }
