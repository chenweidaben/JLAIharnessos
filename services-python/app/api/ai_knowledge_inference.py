# AI 知识推理：当前规则 mock，生产接知识图谱推理 + vLLM
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter()


class KnowledgeInferRequest(BaseModel):
    symptoms: List[str]
    history: List[str]
    labResults: Dict[str, float]


@router.post("/ai/knowledge/infer")
async def infer_knowledge(req: KnowledgeInferRequest):
    """
    AI 知识推理（mock）。
    生产环境接知识图谱推理 + vLLM，输出鉴别诊断/置信度/推荐检查/推荐用药。
    """
    return {
        "differentialDiagnosis": ["肺炎", "肺结核", "肺癌"],
        "mostLikely": "肺炎",
        "confidence": 0.78,
        "recommendedTests": ["胸部CT", "血常规", "CRP"],
        "recommendedMedications": ["阿莫西林克拉维酸钾", "氨溴索"],
        "knowledgePath": ["症状→体征→检查→诊断→治疗"]
    }
