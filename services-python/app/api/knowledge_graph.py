"""
健澜科技 jlmedaios - 医疗知识图谱
Copyright (c) 杭州健澜科技有限公司
"""
from fastapi import APIRouter

# 医疗知识图谱概念验证：当前内置 mock，生产接 Neo4j / 临床知识库

router = APIRouter()

# 内置 mock 知识图谱数据（疾病）
DISEASE_MOCK = {
    "I10": {
        "synonyms": ["原发性高血压"],
        "relatedSymptoms": ["头痛", "头晕"],
        "relatedDrugs": ["氨氯地平", "缬沙坦"],
        "relatedLabs": ["血压"],
        "complications": ["脑卒中", "冠心病"],
    },
    "E11": {
        "synonyms": [],
        "relatedSymptoms": ["多饮", "多尿"],
        "relatedDrugs": ["二甲双胍"],
        "relatedLabs": ["空腹血糖", "糖化血红蛋白"],
        "complications": ["肾病", "视网膜病变"],
    },
    "J18": {
        "synonyms": ["肺部感染"],
        "relatedSymptoms": ["发热", "咳嗽"],
        "relatedDrugs": ["阿莫西林"],
        "relatedLabs": ["血常规", "C反应蛋白"],
        "complications": ["呼吸衰竭"],
    },
}

# 内置 mock 知识图谱数据（药品）
DRUG_MOCK = {
    "二甲双胍": {
        "category": "双胍类降糖药",
        "indications": ["2型糖尿病"],
        "contraindications": ["肾功能不全"],
        "interactions": ["造影剂"],
        "dosageForms": ["片剂", "缓释片"],
    },
    "阿莫西林": {
        "category": "青霉素类抗生素",
        "indications": ["呼吸道感染"],
        "contraindications": ["青霉素过敏"],
        "interactions": [],
        "dosageForms": ["胶囊", "颗粒"],
    },
}


@router.get("/ai/knowledge/disease/{diseaseCode}")
async def get_disease(diseaseCode: str):
    """
    疾病知识图谱（mock）
    当前返回内置数据，生产接 Neo4j / 临床知识库
    """
    return DISEASE_MOCK.get(diseaseCode, {})


@router.get("/ai/knowledge/drug/{drugName}")
async def get_drug(drugName: str):
    """
    药品知识图谱（mock）
    当前返回内置数据，生产接 Neo4j / 临床知识库
    """
    return DRUG_MOCK.get(drugName, {})
