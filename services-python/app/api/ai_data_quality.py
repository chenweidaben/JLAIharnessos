"""
健澜科技 jlmedaios - 数据质量检查
Copyright (c) 杭州健澜科技有限公司
"""
from fastapi import APIRouter
from pydantic import BaseModel, Field

# 数据质量检查：当前规则 mock，生产接 Great Expectations / dbt tests

router = APIRouter()


class DataQualityRequest(BaseModel):
    tableName: str
    sampleData: list = Field(default_factory=list)


@router.post("/ai/data/quality")
async def data_quality(req: DataQualityRequest):
    """
    数据质量检查（mock 规则）
    当前返回固定示例，生产接 Great Expectations / dbt tests
    """
    return {
        "tableName": req.tableName,
        "totalRecords": 100000,
        "qualityScore": 0.87,
        "issues": [
            {"field": "idCard", "issue": "格式错误率3.2%", "severity": "high"},
            {"field": "phone", "issue": "空值率8.5%", "severity": "medium"},
        ],
        "suggestion": "建议补全患者手机号，提升随访触达率",
    }
