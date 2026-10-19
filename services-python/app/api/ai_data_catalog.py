# AI 数据目录：当前规则 mock，生产接 vLLM + 数据治理模型
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class DataCatalogRequest(BaseModel):
    schemaSample: dict


@router.post("/ai/data/catalog")
async def data_catalog(req: DataCatalogRequest):
    """
    AI 数据目录（mock）。
    生产环境接 vLLM + 数据治理模型，输出建议分类/敏感度分级/血缘关系。
    """
    return {
        "suggestedCategories": ["患者基本信息", "诊疗记录"],
        "sensitivityClassification": {"idCard": "高敏", "name": "敏感", "diagnosis": "内部"},
        "lineage": {"patient_table": "来自EMPI系统", "order_table": "来自医嘱系统"}
    }
