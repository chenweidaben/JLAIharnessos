# AI 知识推理：当前规则 mock，生产接 vLLM + 知识图谱推理模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter()


class KnowledgeReasonRequest(BaseModel):
    symptoms: List[str]


@router.post("/ai/kg/reason")
async def knowledge_reason(req: KnowledgeReasonRequest):
    """
    AI 知识推理（mock）。
    生产环境接 vLLM + 知识图谱推理模型，输出可能诊断/推理路径/建议检查/置信度。
    """
    return {
        "possibleDiagnoses": ["肺炎", "肺结核"],
        "reasoningPath": ["咳嗽→肺部感染→肺炎", "低热+盗汗→结核"],
        "recommendedTests": ["胸部CT", "痰培养"],
        "confidence": {"肺炎": 0.75, "肺结核": 0.45}
    }
