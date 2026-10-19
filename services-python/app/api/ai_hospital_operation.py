# 医院运营预测：当前规则 mock，生产接时序预测模型
from fastapi import APIRouter

router = APIRouter()


@router.get("/ai/hospital/forecast")
async def forecast_hospital(department: str, horizon: str):
    """
    医院运营预测（mock）。
    生产环境接时序预测模型，输出科室门诊量/床位占用率预测。
    """
    return {
        "department": department,
        "horizon": horizon,
        "forecast": {
            "outpatientVolume": {"current": 5000, "forecast": 5200, "growth": "+4%"},
            "bedOccupancy": {"current": 0.92, "forecast": 0.95, "risk": "偏高"}
        },
        "recommendation": "建议增加2张监护床位"
    }
