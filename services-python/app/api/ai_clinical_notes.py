"""
健澜科技 jlmedaios - AI 临床笔记结构化
Copyright (c) 杭州健澜科技有限公司
"""
from fastapi import APIRouter
from pydantic import BaseModel

# AI 临床笔记结构化：当前模板 mock，生产接 vLLM + 医疗 NLP 模型

router = APIRouter()


class ClinicalNotesExtractRequest(BaseModel):
    rawText: str


@router.post("/ai/notes/extract")
async def extract_clinical_notes(req: ClinicalNotesExtractRequest):
    """
    AI 临床笔记结构化（mock 模板）
    当前返回固定 SOAP 格式模板，生产接 vLLM + 医疗 NLP 模型
    """
    # 先过 mask_phi（生产实际调用 sensitive.mask_phi）
    # masked_text = mask_phi(req.rawText)

    return {
        "chiefComplaint": "发热3天",
        "presentIllness": "患者3天前无明显诱因出现发热...",
        "pastHistory": "高血压病史5年",
        "medications": ["氨氯地平5mg qd"],
        "physicalExam": "T 38.5℃，P 92次/分...",
        "assessment": "肺炎待查",
        "plan": "血常规+CRP，胸部CT",
    }
