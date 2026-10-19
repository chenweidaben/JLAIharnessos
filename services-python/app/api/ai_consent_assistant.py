# AI 知情同意辅助：当前规则 mock，生产接 vLLM + 医学文书生成模型
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class ConsentGenerateRequest(BaseModel):
    formType: str
    diagnosis: str
    procedureName: str


@router.post("/ai/consent/generate")
async def consent_generate(req: ConsentGenerateRequest):
    """
    AI 知情同意辅助（mock）。
    生产环境接 vLLM + 医学文书生成模型，输出风险/替代方案/通俗解释。
    """
    return {
        "formType": req.formType,
        "diagnosis": req.diagnosis,
        "procedure": req.procedureName,
        "risks": ["出血", "感染", "肠粘连", "麻醉意外"],
        "alternatives": ["保守治疗", "开腹手术"],
        "plainLanguage": "用通俗语言解释手术风险..."
    }
