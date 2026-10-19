# AI 物联网监控：当前规则 mock，生产接 vLLM + IoT 时序异常检测模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()


class IoTAnomalyRequest(BaseModel):
    deviceData: List[dict]


@router.post("/ai/iot/anomaly")
async def iot_anomaly(req: IoTAnomalyRequest):
    """
    AI 物联网监控（mock）。
    生产环境接 vLLM + IoT 时序异常检测模型，输出异常列表/处置建议。
    """
    return {
        "anomalies": [
            {"device": "监护仪-ICU-03", "metric": "heartRate", "value": "142bpm", "expected": "60-100", "severity": "critical"},
            {"device": "输液泵-05", "metric": "flowRate", "value": "偏差20%", "severity": "warning"}
        ],
        "recommendation": "立即检查ICU-03监护仪连接，确认患者状态"
    }
