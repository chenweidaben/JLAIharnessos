"""
健澜科技 jlmedaios - AI 教学助手
Copyright (c) 杭州健澜科技有限公司
"""
from fastapi import APIRouter
from pydantic import BaseModel

# AI 教学助手：当前模板 mock，生产接 vLLM + 医学教学案例库

router = APIRouter()


class TeachingCaseRequest(BaseModel):
    department: str
    difficulty: str


@router.post("/ai/teaching/case")
async def teaching_case(req: TeachingCaseRequest):
    """
    AI 教学助手（mock 模板）
    当前返回固定病例，生产接 vLLM + 医学教学案例库
    """
    return {
        "caseTitle": "社区获得性肺炎典型病例",
        "chiefComplaint": "发热咳嗽5天",
        "history": "患者5天前受凉后出现发热...",
        "physicalExam": "T 38.8℃，P 96次/分，右下肺湿啰音",
        "labResults": {"WBC": 12.5, "CRP": 45},
        "discussionQuestions": ["如何鉴别肺炎类型？", "经验性抗感染如何选药？"],
        "keyPoints": ["肺炎链球菌最常见", "首选青霉素类"],
    }
