"""
健澜科技 jlmedaios - AI 健康大脑
Copyright (c) 杭州健澜科技有限公司
"""
from fastapi import APIRouter
from pydantic import BaseModel

# AI 健康大脑：系统级智能建议，mock 数据，生产接实时聚合

router = APIRouter()


class BrainSuggestRequest(BaseModel):
    deptCode: str
    timeRange: str


@router.get("/ai/brain/pulse")
async def brain_pulse():
    """
    系统脉搏：AI 服务运行状态
    """
    return {
        "ai_services": 13,
        "encounters_processed": 1024,
        "learning_samples": 512,
        "vllm_status": "mock",
    }


@router.post("/ai/brain/suggest")
async def brain_suggest(req: BrainSuggestRequest):
    """
    系统级优化建议（mock）
    当前返回通用 3 条，生产接实时聚合各科室数据
    """
    return [
        {
            "suggestion": "平均住院日高于全院 15%，建议优化临床路径",
            "priority": "high",
        },
        {
            "suggestion": "手术患者满意度 82%，建议优化术前沟通",
            "priority": "medium",
        },
        {
            "suggestion": "抗菌药物使用强度超标，建议加强处方点评",
            "priority": "high",
        },
    ]


@router.get("/ai/brain/model-status")
async def model_status():
    """
    vLLM 模型状态（mock）
    """
    return {
        "model_name": "qwen2.5-72b-instruct",
        "vram_used": "60GB",
        "status": "mock",
    }
