# AI 医生助手对话：当前规则 mock，生产接 vLLM+RAG 检索患者病历
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict

router = APIRouter()


class DoctorChatRequest(BaseModel):
    doctorQuery: str
    patientContext: Dict[str, object]


@router.post("/ai/doctor/chat")
async def doctor_chat(req: DoctorChatRequest):
    """
    AI 医生助手对话（mock）。
    生产环境接 vLLM+RAG 检索患者病历，输出回复/引用文献/置信度。
    """
    return {
        "reply": "患者张某，男，65岁，高血压病史10年，本次因胸闷入院。当前用药：氨氯地平5mg qd。建议完善心电图和心肌酶检查。",
        "citations": ["MR202610001", "Order202610005"],
        "confidence": 0.92
    }
