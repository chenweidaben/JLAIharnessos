"""
健澜科技 jlmedaios - AI 病历书写助手
Copyright (c) 杭州健澜科技有限公司
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field

# AI 病历书写助手：当前模板 mock，生产接 vLLM + 病历模板库

router = APIRouter()


class MedicalScribeRequest(BaseModel):
    chiefComplaint: str
    symptoms: list = Field(default_factory=list)
    vitalSigns: dict = Field(default_factory=dict)
    diagnosis: str


@router.post("/ai/scribe/draft")
async def draft_medical_record(req: MedicalScribeRequest):
    """
    AI 病历书写助手（mock 模板）
    当前返回固定 SOAP 格式模板，生产接 vLLM + 病历模板库
    """
    vs = req.vitalSigns
    temp = vs.get("temp", "36.5")
    hr = vs.get("hr", "72")
    bp = vs.get("bp", "120/80")

    return {
        "subjective": f"患者主诉：{req.chiefComplaint}，{','.join(req.symptoms)}",
        "objective": f"T {temp}℃，P {hr}次/分，R 20次/分，BP {bp}mmHg，神志清，精神可",
        "assessment": f"初步诊断：{req.diagnosis}",
        "plan": "1.完善相关检查 2.对症治疗 3.随诊",
    }
