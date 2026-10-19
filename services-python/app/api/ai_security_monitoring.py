# AI 安全监控：当前规则 mock，生产接 vLLM + SOC 安全运营中心模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()


class SecurityMonitorRequest(BaseModel):
    securityEvents: List[dict]


@router.post("/ai/security/monitor")
async def security_monitor(req: SecurityMonitorRequest):
    """
    AI 安全监控（mock）。
    生产环境接 vLLM + SOC 安全运营中心模型，输出威胁等级/事件列表/处置建议。
    """
    return {
        "threatLevel": "medium",
        "events": [
            {"type": "暴力破解", "count": 156, "source": "10.0.1.23"},
            {"type": "异常登录", "count": 3, "source": "未知IP"}
        ],
        "recommendation": "建议封禁10.0.1.23并启用双因素认证"
    }
