# AI 数据增强：当前规则 mock，生产接 vLLM + 医学文本增强模型
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()


class DataAugmentRequest(BaseModel):
    sampleData: List[dict]
    augmentCount: int


@router.post("/ai/data/augment")
async def data_augment(req: DataAugmentRequest):
    """
    AI 数据增强（mock）。
    生产环境接 vLLM + 医学文本增强模型，输出增强数量/方法/质量分/抽检建议。
    """
    return {
        "originalCount": 1000,
        "augmentedCount": 5000,
        "methods": ["同义词替换", "回译", "随机删除"],
        "qualityScore": 0.92,
        "warning": "增强后需人工抽检10%确保不改变语义"
    }
