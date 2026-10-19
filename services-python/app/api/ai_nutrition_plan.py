# AI 营养处方辅助：当前规则 mock，生产接 vLLM + 临床营养 NLP 模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict

router = APIRouter()


class NutritionPlanRequest(BaseModel):
    patientCondition: Dict[str, object]


@router.post("/ai/nutrition/plan")
async def nutrition_plan(req: NutritionPlanRequest):
    """
    AI 营养处方辅助（mock）。
    生产环境接 vLLM + 临床营养 NLP 模型，输出膳食类型/每日热量/蛋白质/碳水比/脂肪比/警告。
    """
    return {
        "dietType": "糖尿病低盐低脂膳食",
        "dailyCalorie": 1800,
        "protein": 75,
        "carbRatio": "50%",
        "fatRatio": "25%",
        "warning": "限制精制糖，增加膳食纤维"
    }
