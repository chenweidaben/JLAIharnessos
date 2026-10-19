"""
健澜科技 jlmedaios - 急诊智能分诊
Copyright (c) 杭州健澜科技有限公司
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional

# 急诊智能分诊：当前规则 mock，生产接 vLLM + 生命体征实时监测

router = APIRouter()


class VitalSigns(BaseModel):
    bp: str = ""
    hr: int = 0
    temp: float = 0.0
    spo2: int = 0
    consciousness: str = ""


class EmergencyTriageRequest(BaseModel):
    chiefComplaint: str
    vitalSigns: VitalSigns


@router.post("/ai/emergency/triage")
async def emergency_triage(req: EmergencyTriageRequest):
    """
    急诊智能分诊（mock 规则）
    当前返回固定示例，生产接 vLLM + 生命体征实时监测
    """
    vs = req.vitalSigns

    # 规则 1：意识模糊/昏迷 → Ⅰ级濒危
    if vs.consciousness in ("模糊", "昏迷"):
        return {
            "recommendedLevel": "Ⅰ级濒危",
            "confidence": 0.95,
            "reasons": [f"意识{vs.consciousness}"],
            "suggestion": "立即急诊抢救室",
        }

    # 规则 2：SpO2<90 或 收缩压<90 → Ⅱ级危重
    bp_systolic = 0
    if "/" in vs.bp:
        try:
            bp_systolic = int(vs.bp.split("/")[0])
        except ValueError:
            pass

    if vs.spo2 < 90 or bp_systolic < 90:
        reasons = []
        if vs.spo2 < 90:
            reasons.append(f"SpO2 {vs.spo2}%偏低")
        if bp_systolic < 90:
            reasons.append(f"血压{vs.bp}偏低")
        return {
            "recommendedLevel": "Ⅱ级危重",
            "confidence": 0.85,
            "reasons": reasons,
            "suggestion": "立即急诊抢救室",
        }

    # 规则 3：体温>39 或 HR>120 → Ⅲ级急症
    if vs.temp > 39 or vs.hr > 120:
        reasons = []
        if vs.temp > 39:
            reasons.append(f"体温{vs.temp}℃偏高")
        if vs.hr > 120:
            reasons.append(f"心率{vs.hr}偏快")
        return {
            "recommendedLevel": "Ⅲ级急症",
            "confidence": 0.75,
            "reasons": reasons,
            "suggestion": "急诊观察室",
        }

    # 规则 4：否则 → Ⅳ级非急症
    return {
        "recommendedLevel": "Ⅳ级非急症",
        "confidence": 0.6,
        "reasons": ["生命体征稳定"],
        "suggestion": "普通急诊诊室",
    }
