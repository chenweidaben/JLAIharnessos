"""
健澜科技 jlmedaios - 智能排班辅助
Copyright (c) 杭州健澜科技有限公司
"""
from fastapi import APIRouter
from pydantic import BaseModel

# 智能排班辅助：当前规则 mock，生产接优化求解器

router = APIRouter()


class WardScheduleRequest(BaseModel):
    deptCode: str
    onDutyDoctors: list
    dateRange: str


class OperationRoomRequest(BaseModel):
    surgeons: list
    operations: list
    date: str


@router.post("/ai/scheduling/ward")
async def schedule_ward(req: WardScheduleRequest):
    """
    病房排班推荐（mock）
    当前返回固定 2 天示例，生产接优化求解器（约束：避免连续夜班超过2次）
    """
    return {
        "deptCode": req.deptCode,
        "schedule": [
            {"date": "2026-10-20", "dayShift": "张医生", "nightShift": "李医生"},
            {"date": "2026-10-21", "dayShift": "王医生", "nightShift": "赵医生"},
        ],
        "note": "避免连续夜班超过2次",
    }


@router.post("/ai/scheduling/operation-room")
async def schedule_operation_room(req: OperationRoomRequest):
    """
    手术室分配建议（mock）
    当前返回固定 2 间手术室示例，生产接优化求解器
    """
    return {
        "date": req.date,
        "rooms": [
            {"room": "1号手术室", "surgeon": "张医生", "operation": "阑尾切除术", "time": "09:00"},
            {"room": "2号手术室", "surgeon": "李医生", "operation": "胆囊切除术", "time": "10:00"},
        ],
    }
