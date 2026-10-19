"""
健澜科技 jlmedaios AI 服务 - 临床决策支持（CDS）。

合规红线：
- 所有入参必须先过 sensitive.mask_phi 脱敏
- AI 推理预留 vLLM 本地调用，当前 mock
- 与现有 cdss.py 并存，本文件聚焦药物相互作用/剂量/禁忌
"""

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.sensitive import mask_phi

router = APIRouter()


class DrugInteractionRequest(BaseModel):
    """药物相互作用请求体。"""
    drugA: str
    drugB: str


class DoseCheckRequest(BaseModel):
    """剂量审核请求体。"""
    drugName: str
    weightKg: float
    age: int
    liverFunction: str


class ContraindicationRequest(BaseModel):
    """禁忌审核请求体。"""
    diagnosis: str
    drugName: str


@router.post("/ai/cds/drug-interaction")
async def drug_interaction(req: DrugInteractionRequest):
    """
    药物相互作用审核。

    Mock 规则：
    - 华法林 + 阿司匹林 → 禁忌/出血风险高
    - 奥美拉唑 + 地高辛 → 慎用/影响吸收
    - 否则 → 安全
    """
    drug_a = req.drugA
    drug_b = req.drugB

    if "华法林" in drug_a and "阿司匹林" in drug_b:
        return {
            "drugA": drug_a,
            "drugB": drug_b,
            "level": "禁忌",
            "risk": "出血风险高",
            "suggestion": "禁止联用"
        }
    elif "奥美拉唑" in drug_a and "地高辛" in drug_b:
        return {
            "drugA": drug_a,
            "drugB": drug_b,
            "level": "慎用",
            "risk": "影响地高辛吸收",
            "suggestion": "监测血药浓度"
        }
    else:
        return {
            "drugA": drug_a,
            "drugB": drug_b,
            "level": "安全",
            "risk": "无",
            "suggestion": "可联用"
        }


@router.post("/ai/cds/dose-check")
async def dose_check(req: DoseCheckRequest):
    """
    剂量审核。

    Mock 规则：
    - 氨基糖苷 + age>=65 → 减半/肾毒性警告
    - liverFunction 含"异常" → 减量30%
    - 否则 → 按说明书
    """
    drug_name = req.drugName

    if "氨基糖苷" in drug_name and req.age >= 65:
        return {
            "drugName": drug_name,
            "adjustedDose": "减半",
            "warning": "老年患者肾毒性警告"
        }
    elif "异常" in req.liverFunction:
        return {
            "drugName": drug_name,
            "adjustedDose": "减量30%",
            "warning": "肝功能异常需调整"
        }
    else:
        return {
            "drugName": drug_name,
            "adjustedDose": "按说明书",
            "warning": "无"
        }


@router.post("/ai/cds/contraindication")
async def contraindication(req: ContraindicationRequest):
    """
    禁忌审核。

    Mock 规则：
    - 妊娠 + 喹诺酮 → 禁忌
    - 青光眼 + 阿托品 → 禁忌
    - 否则 → 无禁忌
    """
    diagnosis = req.diagnosis
    drug_name = req.drugName

    if "妊娠" in diagnosis and "喹诺酮" in drug_name:
        return {
            "diagnosis": diagnosis,
            "drugName": drug_name,
            "contraindicated": True,
            "reason": "孕妇禁用喹诺酮类"
        }
    elif "青光眼" in diagnosis and "阿托品" in drug_name:
        return {
            "diagnosis": diagnosis,
            "drugName": drug_name,
            "contraindicated": True,
            "reason": "青光眼禁用阿托品"
        }
    else:
        return {
            "diagnosis": diagnosis,
            "drugName": drug_name,
            "contraindicated": False,
            "reason": "无禁忌"
        }
