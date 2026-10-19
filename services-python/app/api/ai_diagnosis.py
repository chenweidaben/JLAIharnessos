"""
健澜科技 jlmedaios - 辅助诊断推理
Copyright (c) 杭州健澜科技有限公司
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional

# 辅助诊断推理：当前规则 mock，生产接 vLLM + 临床知识库

router = APIRouter()


class DiagnosisRequest(BaseModel):
    chiefComplaint: str
    symptoms: list = Field(default_factory=list)
    vitalSigns: dict = Field(default_factory=dict)


@router.post("/ai/diagnosis/suggest")
async def suggest_diagnosis(req: DiagnosisRequest):
    """
    辅助诊断推理（mock 规则）
    当前返回固定示例，生产接 vLLM + 临床知识库
    """
    symptoms = set(req.symptoms)
    vital = req.vitalSigns

    # 规则 1：发热 + 咳嗽 → 肺炎 + 支气管炎
    if "发热" in symptoms and "咳嗽" in symptoms:
        return {
            "differentials": [
                {
                    "diagnosis": "肺炎",
                    "icd": "J18",
                    "probability": 0.65,
                    "evidence": ["发热", "咳嗽", "SpO2偏低"],
                },
                {
                    "diagnosis": "支气管炎",
                    "icd": "J40",
                    "probability": 0.25,
                    "evidence": ["咳嗽"],
                },
            ],
            "suggestedLabs": ["血常规", "C反应蛋白", "胸部CT"],
            "confidence": 0.80,
        }

    # 规则 2：腹痛 + 呕吐 → 急性胃肠炎 + 阑尾炎
    if "腹痛" in symptoms and "呕吐" in symptoms:
        return {
            "differentials": [
                {
                    "diagnosis": "急性胃肠炎",
                    "icd": "K52",
                    "probability": 0.55,
                    "evidence": ["腹痛", "呕吐", "腹泻"],
                },
                {
                    "diagnosis": "阑尾炎",
                    "icd": "K35",
                    "probability": 0.20,
                    "evidence": ["右下腹压痛"],
                },
            ],
            "suggestedLabs": ["血常规", "腹部B超"],
            "confidence": 0.70,
        }

    # 默认返回
    return {
        "differentials": [],
        "suggestedLabs": [],
        "confidence": 0.30,
    }
