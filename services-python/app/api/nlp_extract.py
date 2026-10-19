"""
健澜科技 jlmedaios AI 服务 - 病历结构化提取。

# 病历NLP结构化：当前规则mock，生产接vLLM+微调模型

合规红线：
- 所有入参必须先过 sensitive.mask_phi 脱敏
- AI 推理预留 vLLM 本地调用，当前 mock
"""

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.sensitive import mask_phi

router = APIRouter()


class ExtractRequest(BaseModel):
    """病历提取请求体。"""
    text: str


@router.post("/ai/nlp/extract")
async def extract_medical_record(req: ExtractRequest):
    """
    病历 NLP 结构化提取。

    Mock 规则：
    - 含"血压"→ diagnoses: [{code: "I10", name: "高血压"}]
    - 含"二甲双胍"→ medications: [{name: "二甲双胍", dose: "0.5g", frequency: "bid"}]
    - 含"血糖"→ labValues: [{item: "血糖", value: 6.1, unit: "mmol/L", abnormal: "H"}]
    """
    # 合规红线：所有入参必须先过脱敏
    masked_text = mask_phi(req.text)

    # mock 分段提取（实际用 NLP 分词+命名实体识别）
    chief_complaint = "患者主诉：" + masked_text[:50] if len(masked_text) > 50 else "患者主诉：" + masked_text
    present_illness = masked_text
    past_history = "无特殊"
    physical_exam = "T 36.5℃ P 78次/分 R 18次/分 BP 120/80mmHg"

    diagnoses = []
    if "血压" in masked_text:
        diagnoses.append({"code": "I10", "name": "高血压"})
    if "糖尿病" in masked_text:
        diagnoses.append({"code": "E11", "name": "2型糖尿病"})

    medications = []
    if "二甲双胍" in masked_text:
        medications.append({"name": "二甲双胍", "dose": "0.5g", "frequency": "bid"})
    if "阿司匹林" in masked_text:
        medications.append({"name": "阿司匹林", "dose": "100mg", "frequency": "qd"})

    lab_values = []
    if "血糖" in masked_text:
        lab_values.append({"item": "血糖", "value": 6.1, "unit": "mmol/L", "abnormal": "H"})
    if "血压" in masked_text:
        lab_values.append({"item": "收缩压", "value": 145, "unit": "mmHg", "abnormal": "H"})

    return {
        "chiefComplaint": chief_complaint,
        "presentIllness": present_illness,
        "pastHistory": past_history,
        "physicalExam": physical_exam,
        "diagnoses": diagnoses,
        "medications": medications,
        "labValues": lab_values
    }
