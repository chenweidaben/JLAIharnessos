# AI 患者助手：当前规则 mock，生产接 vLLM+患者画像 RAG，通俗中文避免医学术语
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict

router = APIRouter()


class PatientChatRequest(BaseModel):
    patientQuery: str
    patientContext: Dict[str, object]


@router.post("/ai/patient/chat")
async def patient_chat(req: PatientChatRequest):
    """
    AI 患者助手（mock）。
    生产环境接 vLLM+患者画像 RAG，输出通俗中文回复/快捷操作建议。
    """
    return {
        "reply": "您的CT报告已出，显示肺部无明显异常。报告可在'健康档案'中查看。下次复查建议3个月后。",
        "suggestions": ["查看完整报告", "预约复诊", "在线咨询医生"],
        "language": "通俗中文，避免医学术语"
    }
