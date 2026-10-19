"""
健澜科技 jlmedaios - 智能预问诊
Copyright (c) 杭州健澜科技有限公司
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field

# 智能预问诊：当前规则 mock，生产接 vLLM + 症状知识库

router = APIRouter()


class SymptomCheckRequest(BaseModel):
    age: int
    gender: str
    symptoms: list = Field(default_factory=list)
    durationDays: int


@router.post("/ai/symptom/check")
async def symptom_check(req: SymptomCheckRequest):
    """
    智能预问诊（mock 规则）
    当前返回固定示例，生产接 vLLM + 症状知识库
    """
    symptoms = set(req.symptoms)

    # 规则 1：咳嗽或发热 → 呼吸科 + 全科
    if "咳嗽" in symptoms or "发热" in symptoms:
        likely_departments = ["呼吸科", "全科医学科"]
        preliminary_questions = ["是否发热？", "咳嗽有痰吗？"]
        home_care_advice = "多饮水，注意休息，如体温>38.5℃及时就医"
        triage_level = "建议门诊就诊"
    # 规则 2：腹痛 → 消化内科 + 普外科
    elif "腹痛" in symptoms:
        likely_departments = ["消化内科", "普外科"]
        preliminary_questions = ["腹痛位置？", "有无呕吐？"]
        home_care_advice = "暂禁食，如腹痛加剧或放射至后背及时就医"
        triage_level = "建议门诊就诊"
    # 默认：全科
    else:
        likely_departments = ["全科医学科"]
        preliminary_questions = ["主要不适是什么？"]
        home_care_advice = "建议门诊就诊，详细描述症状"
        triage_level = "建议门诊就诊"

    return {
        "likelyDepartments": likely_departments,
        "triageLevel": triage_level,
        "preliminaryQuestions": preliminary_questions,
        "homeCareAdvice": home_care_advice,
    }
