# AI 异常检测：当前规则 mock，生产接 vLLM + AIOps 异常检测模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()


class AnomalyDetectRequest(BaseModel):
    metrics: List[dict]
    timeRange: str


@router.post("/ai/anomaly/detect")
async def anomaly_detect(req: AnomalyDetectRequest):
    """
    AI 异常检测（mock）。
    生产环境接 vLLM + AIOps 异常检测模型，输出异常列表/根因/建议。
    """
    return {
        "anomalies": [
            {"metric": "errorRate", "value": "5.2%", "expected": "<0.1%", "severity": "critical"},
            {"metric": "p99Latency", "value": "1200ms", "expected": "<500ms", "severity": "warning"}
        ],
        "rootCause": "疑似数据库慢查询",
        "suggestion": "检查慢SQL日志"
    }
