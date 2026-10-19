"""
健澜科技 jlmedaios - 处方前置审核
Copyright (c) 杭州健澜科技有限公司
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field

# 处方前置审核：当前规则 mock，生产接 vLLM + 药物知识库

router = APIRouter()


class PrescriptionReviewRequest(BaseModel):
    patientAge: int
    patientGender: str
    diagnosis: str
    medications: list = Field(default_factory=list)


@router.post("/ai/prescription/review")
async def review_prescription(req: PrescriptionReviewRequest):
    """
    处方前置审核（mock 规则）
    当前返回固定示例，生产接 vLLM + 药物知识库
    """
    medications = set(req.medications)
    issues = []

    # 规则 1：华法林 + 阿司匹林 → 药物相互作用（high）
    if "华法林" in medications and "阿司匹林" in medications:
        issues.append({
            "type": "drug_interaction",
            "description": "华法林+阿司匹林增加出血风险",
            "severity": "high",
        })

    # 规则 2：老年（>=75）+ 二甲双胍 → 剂量检查（medium）
    if req.patientAge >= 75 and "二甲双胍" in medications:
        issues.append({
            "type": "dose_check",
            "description": "老年患者使用二甲双胍需注意肾功能",
            "severity": "medium",
        })

    # 审核结论
    if issues:
        approved = False
        suggestion = "建议调整华法林剂量或停用阿司匹林" if any(i["type"] == "drug_interaction" for i in issues) else "建议调整用药方案"
    else:
        approved = True
        suggestion = "处方通过"

    return {
        "approved": approved,
        "issues": issues,
        "suggestion": suggestion,
    }
