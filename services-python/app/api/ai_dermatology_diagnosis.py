# AI 皮肤病辅助诊断：当前规则 mock，生产接 vLLM + 皮肤影像 AI + 临床 NLP 模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict

router = APIRouter()


class DermatologyDiagnosisRequest(BaseModel):
    lesionDescription: Dict[str, object]


@router.post("/ai/dermatology/diagnose")
async def dermatology_diagnose(req: DermatologyDiagnosisRequest):
    """
    AI 皮肤病辅助诊断（mock）。
    生产环境接 vLLM + 皮肤影像 AI + 临床 NLP 模型，输出可能诊断/最可能诊断/鉴别要点/推荐检查/一线治疗。
    """
    return {
        "possibleDiagnoses": ["湿疹", "接触性皮炎", "银屑病"],
        "mostLikely": "湿疹",
        "differentialPoints": ["对称分布+剧烈瘙痒→湿疹可能性大"],
        "recommendedTest": "过敏原检测",
        "firstLineTreatment": "外用糖皮质激素+保湿剂"
    }
