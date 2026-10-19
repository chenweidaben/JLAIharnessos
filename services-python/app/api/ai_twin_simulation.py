# AI 数字孪生仿真：当前规则 mock，生产接 vLLM + SimPy 仿真模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict

router = APIRouter()


class TwinSimulateRequest(BaseModel):
    scenario: str
    parameters: Dict[str, object]


@router.post("/ai/twin/simulate")
async def twin_simulate(req: TwinSimulateRequest):
    """
    AI 数字孪生仿真（mock）。
    生产环境接 vLLM + SimPy 仿真模型，输出输入/输出/优化建议/置信度。
    """
    return {
        "scenario": req.scenario,
        "inputs": {"patientArrivalRate": "200人/小时", "doctorCount": 8},
        "outputs": {"avgWaitTime": "25分钟", "maxQueue": 45},
        "optimization": {"add2 doctors": "waitTime→12分钟"},
        "confidence": 0.88
    }
