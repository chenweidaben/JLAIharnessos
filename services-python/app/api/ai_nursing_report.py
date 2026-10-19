# AI 护理交班报告：当前规则 mock，生产接 vLLM + 护理 NLP 摘要模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter()


class NursingHandoverRequest(BaseModel):
    wardData: Dict[str, object]
    patientEvents: List[dict]


@router.post("/ai/nursing/handover")
async def nursing_handover(req: NursingHandoverRequest):
    """
    AI 护理交班报告自动生成（mock）。
    生产环境接 vLLM + 护理 NLP 摘要模型，输出病区/班次/患者数/关键事件/护理重点/待执行医嘱。
    """
    return {
        "ward": "心内科一病区",
        "shift": "白班",
        "totalPatients": 42,
        "keyEvents": ["3床新入院", "15床术后转入", "28床病危通知"],
        "nursingFocus": ["重点关注5床血压波动", "20床血糖监测"],
        "pendingOrders": ["10床明晨采血"]
    }
