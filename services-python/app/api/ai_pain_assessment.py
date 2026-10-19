# AI 疼痛评估辅助：当前规则 mock，生产接 vLLM + 疼痛管理指南
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List, Dict

router = APIRouter()


class PainAssistRequest(BaseModel):
    patientId: str
    painScore: int
    location: str
    character: str
    medications: List[str]


@router.post("/ai/pain/assist")
async def pain_assist(req: PainAssistRequest):
    """
    AI 疼痛评估辅助（mock）。
    生产环境接 vLLM + 疼痛管理指南，输出推荐镇痛方案/预期缓解/警示/随访时间。
    """
    if req.painScore >= 7:
        action = "建议阿片类药物+非甾体联合镇痛"
        expected = "60-70%"
        warning = "注意便秘和呼吸抑制"
        followup = 30
    elif req.painScore >= 4:
        action = "建议非甾体+辅助镇痛"
        expected = "40-50%"
        warning = "注意胃肠道反应"
        followup = 60
    else:
        action = "观察+物理镇痛"
        expected = "20-30%"
        warning = "无特殊警示"
        followup = 120

    return {
        "recommendedAction": action,
        "expectedRelief": expected,
        "warning": warning,
        "followUpMinutes": followup
    }


class PainAssessRequest(BaseModel):
    symptoms: Dict[str, object]


@router.post("/ai/pain/assess")
async def pain_assess(req: PainAssessRequest):
    """
    AI 疼痛评估（深化：疼痛类型诊断）。
    生产环境接 vLLM + 疼痛医学 NLP 模型，输出疼痛类型/推荐量表/一线治疗/警告/随访建议。
    """
    return {
        "painType": "慢性神经病理性疼痛",
        "recommendedScale": "DN4量表",
        "firstLineTreatment": "加巴喷丁+普瑞巴林",
        "warning": "注意药物相互作用",
        "followUp": "2周后复诊评估疗效"
    }
