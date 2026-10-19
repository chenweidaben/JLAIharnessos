"""
健澜科技 jlmedaios AI 服务 - 诊疗记忆沉淀 API。

合规红线：
- 所有入参必须先过 sensitive.mask_phi 脱敏
- 记忆存储走本地 JSON，生产用 Redis/PG，禁止境外存储
"""

import json
import os
from collections import Counter
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.config import MEMORY_STORE_PATH
from app.core.sensitive import mask_phi

router = APIRouter()


class FeedbackRequest(BaseModel):
    """诊疗反馈请求体。"""
    patientId: str
    suggestion: str
    feedback: str  # 采纳/拒绝/修正
    correctedVersion: str | None = None


class SimilarCasesRequest(BaseModel):
    """相似病例请求体。"""
    diagnosis: str


def _load_memory() -> list:
    """从本地 JSON 文件加载记忆数据。"""
    path = Path(MEMORY_STORE_PATH)
    if not path.exists():
        return []
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _save_memory(data: list):
    """保存记忆数据到本地 JSON 文件。"""
    path = Path(MEMORY_STORE_PATH)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


@router.post("/memory/feedback")
async def save_feedback(req: FeedbackRequest):
    """
    保存诊疗反馈（采纳/拒绝/修正）。

    合规红线：入参先过 mask_phi 脱敏后再写入本地记忆。
    """
    # 合规红线：所有入参必须先过脱敏
    masked_suggestion = mask_phi(req.suggestion)
    masked_corrected = mask_phi(req.correctedVersion) if req.correctedVersion else None

    memory = _load_memory()
    entry = {
        "patientId": req.patientId,
        "suggestion": masked_suggestion,
        "feedback": req.feedback,
        "correctedVersion": masked_corrected
    }
    memory.append(entry)
    _save_memory(memory)

    return {
        "status": "saved",
        "feedback_count": len(memory)
    }


@router.get("/memory/suggestions/{patientId}")
async def get_suggestions(patientId: str):
    """
    基于历史反馈给该患者的诊疗建议。

    Mock 规则：统计该患者历史 feedback 中出现频率最高的 diagnosis 关键词，给 1-2 条建议。
    """
    memory = _load_memory()
    patient_entries = [e for e in memory if e["patientId"] == patientId]

    # Mock：基于历史 suggestion 中的关键词频率
    keywords = []
    for e in patient_entries:
        # 简单提取关键词（mock，实际用 NLP 分词）
        words = e["suggestion"].split()
        keywords.extend(words)

    counter = Counter(keywords)
    top_keywords = [k for k, _ in counter.most_common(2)]

    suggestions = [f"建议关注：{kw}" for kw in top_keywords]
    if not suggestions:
        suggestions = ["建议全科门诊评估"]

    return {
        "patientId": patientId,
        "suggestions": suggestions,
        "based_on_history": len(patient_entries)
    }


@router.post("/memory/similar-cases")
async def similar_cases(req: SimilarCasesRequest):
    """
    查找相似病例。

    Mock 规则：按 diagnosis 关键词 Jaccard 相似度排序，返回 top 3。
    """
    memory = _load_memory()
    target_words = set(req.diagnosis.split())

    # 计算每条记忆的相似度
    scored = []
    for e in memory:
        # mock：用 suggestion 中的词作为 diagnosis 关键词
        case_words = set(e["suggestion"].split())
        if not case_words:
            continue
        intersection = len(target_words & case_words)
        union = len(target_words | case_words)
        similarity = intersection / union if union > 0 else 0
        scored.append((similarity, e))

    # 按相似度降序，取 top 3
    scored.sort(key=lambda x: x[0], reverse=True)
    top3 = [
        {
            "similarity": round(score, 2),
            "patientId": e["patientId"],
            "suggestion": e["suggestion"],
            "feedback": e["feedback"]
        }
        for score, e in scored[:3]
    ]

    return {
        "diagnosis": req.diagnosis,
        "similar_cases": top3,
        "total_matched": len(top3)
    }
