"""
健澜科技 jlmedaios AI 服务 - 影像报告生成 API。

合规红线：
- TODO: 调用本地 vLLM http://vllm:8000/v1/chat/completions 生成报告
- 禁止境外大模型 API 调用
"""

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class ImagingReportRequest(BaseModel):
    """影像报告请求体。"""
    examType: str
    findings: str


@router.post("/imaging/report")
async def imaging_report(req: ImagingReportRequest):
    """
    影像报告生成。

    TODO: 调用本地 vLLM http://vllm:8000/v1/chat/completions 生成报告。
    当前阶段返回 mock 结果，待 vLLM 部署后接入。
    """
    # TODO: 调用本地 vLLM http://vllm:8000/v1/chat/completions 生成报告
    # 当前阶段返回 mock 结果
    return {
        "examType": req.examType,
        "findings": req.findings,
        "impression": "未见明显异常",
        "model": "local-vllm-mock"
    }
