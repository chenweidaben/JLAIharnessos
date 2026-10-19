# AI 手术记录辅助：当前规则 mock，生产接 vLLM + 手术 NLP 生成模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import Dict

router = APIRouter()


class ORReportRequest(BaseModel):
    surgeryData: Dict[str, object]


@router.post("/ai/or/report")
async def or_report(req: ORReportRequest):
    """
    AI 手术记录辅助（mock）。
    生产环境接 vLLM + 手术 NLP 生成模型，输出手术名称/术前诊断/术后诊断/手术经过/出血量/并发症/标本。
    """
    return {
        "operationName": "腹腔镜阑尾切除术",
        "preOpDiagnosis": "急性阑尾炎",
        "postOpDiagnosis": "急性化脓性阑尾炎",
        "procedureNote": "麻醉满意，取脐上1cm切口...",
        "bloodLoss": "20ml",
        "complications": "无",
        "specimen": "阑尾送病理"
    }
