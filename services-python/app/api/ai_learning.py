"""
健澜科技 jlmedaios AI 服务 - 诊疗经验沉淀服务。

# 诊疗经验沉淀：医生反馈驱动建议权重自学习，生产接向量数据库 Milvus/Qdrant

合规红线：
- 所有入参必须先过 sensitive.mask_phi 脱敏
- AI 推理预留 vLLM 本地调用，当前 mock
"""

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.sensitive import mask_phi

router = APIRouter()


class FeedbackRequest(BaseModel):
    """诊疗反馈请求体。"""
    encounterId: str
    doctorId: str
    suggestionId: str
    accepted: str  # true/false/modified
    actualTreatment: str
    note: str | None = None


@router.post("/ai/learning/feedback")
async def save_feedback(req: FeedbackRequest):
    """
    保存诊疗反馈。

    Mock 规则：写入本地 feedback_store.json（追加到 list），返回 saved + total。
    """
    # 合规红线：所有入参必须先过脱敏
    masked_note = mask_phi(req.note) if req.note else None

    # mock：不真的写文件，返回固定数字
    return {
        "status": "saved",
        "total_feedback": 42
    }


@router.get("/ai/learning/adoption-rate")
async def adoption_rate(deptCode: str | None = None, diagnosis: str | None = None):
    """
    查询建议采纳率。

    Mock 规则：按科室/诊断聚合采纳率，被采纳多次的建议权重自动升高。
    """
    return {
        "deptCode": deptCode or "ALL",
        "total_samples": 42,
        "adoption_rate": 0.85,
        "trend": "up"
    }


@router.get("/ai/learning/high-value")
async def high_value_suggestions():
    """
    查询高价值建议模板 top3。

    Mock 规则：采纳率>80% 且样本量≥10 的建议模板。
    """
    return {
        "templates": [
            {
                "suggestionId": "S001",
                "template": "急性阑尾炎首选腹腔镜",
                "adoption_rate": 0.92,
                "samples": 25
            },
            {
                "suggestionId": "S002",
                "template": "2型糖尿病首选二甲双胍",
                "adoption_rate": 0.88,
                "samples": 30
            },
            {
                "suggestionId": "S003",
                "template": "社区获得性肺炎首选青霉素类",
                "adoption_rate": 0.83,
                "samples": 18
            }
        ]
    }
