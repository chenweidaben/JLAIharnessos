"""
健澜科技 jlmedaios - 资源优化建议
Copyright (c) 杭州健澜科技有限公司
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field

# 资源优化建议：当前规则 mock，生产接运筹优化求解器

router = APIRouter()


class BedAllocationRequest(BaseModel):
    currentOccupancyByWard: dict = Field(default_factory=dict)
    historicalAdmissions: list = Field(default_factory=list)


@router.post("/ai/resource/bed-allocation")
async def bed_allocation(req: BedAllocationRequest):
    """
    床位调配建议（mock 规则）
    当前返回固定示例，生产接运筹优化求解器
    """
    return {
        "reallocationSuggestion": "建议将心内科2张监护床临时调整给呼吸科",
        "reason": "呼吸科占用率95%持续3天，心内科仅70%",
        "estimatedBenefit": "减少呼吸科平均等待时间2.3小时",
    }


@router.get("/ai/resource/staffing")
async def staffing():
    """
    人员配置优化建议（mock 规则）
    当前返回固定示例，生产接运筹优化求解器
    """
    return {
        "suggestion": "建议呼吸科夜班增加1名护士，心内科减少1名",
        "reason": "呼吸科夜间入院率高，心内科夜间平稳",
        "estimatedBenefit": "护士工作满意度提升15%",
    }
