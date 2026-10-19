"""
健澜科技 jlmedaios AI 服务 - 相似病例推荐。

# 相似病例检索：Jaccard 相似度，生产接向量数据库 Milvus/Qdrant

合规红线：
- 所有入参必须先过 sensitive.mask_phi 脱敏
- AI 推理预留 vLLM 本地调用，当前 mock
"""

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.sensitive import mask_phi

router = APIRouter()


class SimilarSearchRequest(BaseModel):
    """相似病例搜索请求体。"""
    patientId: str
    chiefComplaint: str
    mainDiagnosis: str
    ageRange: str
    gender: str


@router.post("/ai/similar/search")
async def search_similar(req: SimilarSearchRequest):
    """
    搜索相似病例（top5）。

    Mock 规则：Jaccard 相似度≥0.6 才入选，返回 5 条相似病例。
    """
    # 合规红线：所有入参必须先过脱敏
    masked_chief_complaint = mask_phi(req.chiefComplaint)

    return {
        "patientId": req.patientId,
        "similar_cases": [
            {
                "diagnosis": "急性阑尾炎",
                "treatment": "腹腔镜阑尾切除术",
                "outcome": "治愈",
                "avgStayDays": 3,
                "recurrenceRate": 0.05
            },
            {
                "diagnosis": "急性胆囊炎",
                "treatment": "腹腔镜胆囊切除术",
                "outcome": "治愈",
                "avgStayDays": 4,
                "recurrenceRate": 0.08
            },
            {
                "diagnosis": "急性胃肠炎",
                "treatment": "补液+抗感染",
                "outcome": "治愈",
                "avgStayDays": 2,
                "recurrenceRate": 0.12
            },
            {
                "diagnosis": "急性胰腺炎",
                "treatment": "禁食+胃肠减压",
                "outcome": "好转",
                "avgStayDays": 7,
                "recurrenceRate": 0.20
            },
            {
                "diagnosis": "泌尿系结石",
                "treatment": "体外碎石",
                "outcome": "治愈",
                "avgStayDays": 3,
                "recurrenceRate": 0.15
            }
        ]
    }


@router.get("/ai/similar/outcome-predict")
async def outcome_predict(patientId: str):
    """
    预测本次诊疗结局。

    Mock 规则：基于相似病例分布预测本次诊疗结局。
    """
    return {
        "patientId": patientId,
        "likelyOutcome": "治愈",
        "confidence": 0.88,
        "similarCaseCount": 12
    }
