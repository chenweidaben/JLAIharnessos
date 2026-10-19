# AI 病历书写辅助：当前规则 mock，生产接 vLLM + 病历 NLP 生成模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict

router = APIRouter()


class DoctorNoteRequest(BaseModel):
    visitData: Dict[str, object]


@router.post("/ai/doctor/note")
async def doctor_note(req: DoctorNoteRequest):
    """
    AI 病历书写辅助（mock）。
    生产环境接 vLLM + 病历 NLP 生成模型，输出主诉/现病史/既往史/体格检查/诊断/处理计划。
    """
    return {
        "chiefComplaint": "反复胸闷3天",
        "presentIllness": "患者3天前无明显诱因出现胸闷...",
        "pastHistory": "高血压病史10年",
        "physicalExam": "T36.5℃ P78次/分 R18次/分 BP130/80mmHg",
        "assessment": "冠心病待排",
        "plan": "建议心电图+心肌酶检查"
    }
