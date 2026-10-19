"""
健澜科技 jlmedaios AI 服务 - 病历质控 AI。

合规红线：
- 所有入参必须先过 sensitive.mask_phi 脱敏
- AI 推理预留 vLLM 本地调用，当前 mock
"""

from fastapi import APIRouter
from pydantic import BaseModel

from app.core.sensitive import mask_phi

router = APIRouter()


class FullReviewRequest(BaseModel):
    """病历全文质控请求体。"""
    documentId: str
    content: str


class DictCheckRequest(BaseModel):
    """术语字典校验请求体。"""
    term: str


@router.post("/ai/qc/full-review")
async def full_review(req: FullReviewRequest):
    """
    病历全文质控。

    Mock 规则：
    - 含"好转"但无具体时间词（如"3天"/"1周"）→ warning: "缺好转时间"
    - 含"诊断"但无 ICD 编码（无 E11/I10 之类）→ error: "诊断未规范编码"
    - 不含"主诉"→ error: "缺主诉段"
    """
    # 合规红线：所有入参必须先过脱敏
    masked_content = mask_phi(req.content)

    violations = []

    # 规则 1：含"好转"但无时间词
    if "好转" in masked_content:
        has_time = any(t in masked_content for t in ["3天", "1周", "1天", "2天", "5天", "2周", "3周"])
        if not has_time:
            violations.append({
                "ruleId": "QC-001",
                "severity": "warning",
                "location": "全文",
                "suggestion": "补充好转时间描述（如'3天后好转'）"
            })

    # 规则 2：含"诊断"但无 ICD 编码
    if "诊断" in masked_content:
        has_icd = any(code in masked_content for code in ["E11", "I10", "E10", "I20", "J18", "K35"])
        if not has_icd:
            violations.append({
                "ruleId": "QC-002",
                "severity": "error",
                "location": "诊断段",
                "suggestion": "补充 ICD-10 编码（如 E11 2型糖尿病）"
            })

    # 规则 3：不含"主诉"
    if "主诉" not in masked_content:
        violations.append({
            "ruleId": "QC-003",
            "severity": "error",
            "location": "全文",
            "suggestion": "补充主诉段"
        })

    return {
        "documentId": req.documentId,
        "violations": violations
    }


@router.post("/ai/qc/dict-check")
async def dict_check(req: DictCheckRequest):
    """
    术语字典校验。

    Mock 规则：
    - 含"糖尿病"→ E11 2型糖尿病
    - 含"高血压"→ I10 原发性高血压
    - 否则 → UNMAPPED
    """
    term = req.term

    if "糖尿病" in term:
        return {
            "input": term,
            "standardCode": "E11",
            "standardName": "2型糖尿病"
        }
    elif "高血压" in term:
        return {
            "input": term,
            "standardCode": "I10",
            "standardName": "原发性高血压"
        }
    else:
        return {
            "input": term,
            "standardCode": "UNMAPPED",
            "standardName": term
        }
