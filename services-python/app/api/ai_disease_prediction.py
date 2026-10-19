# 疾病预测：当前规则 mock，生产接流行病学模型 + 疾控数据
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class DiseasePredictRequest(BaseModel):
    region: str
    timeRange: str


@router.post("/ai/disease/predict")
async def predict_disease(req: DiseasePredictRequest):
    """
    疾病预测（mock）。
    生产环境接流行病学模型 + 疾控数据，输出区域疾病流行趋势预测。
    """
    return {
        "region": req.region,
        "timeRange": req.timeRange,
        "predictions": [
            {"disease": "流感", "trend": "上升", "confidence": 0.85},
            {"disease": "诺如病毒", "trend": "平稳", "confidence": 0.70}
        ],
        "advice": "建议加强流感疫苗接种宣传"
    }
