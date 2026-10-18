/**
 * 健澜科技 jlmedaios - 病历借阅复印管理 V14 路由（M462-C）
 *
 * GET /api/v1/emr-borrow   （read，auth:true）返回借阅记录列表
 * POST /api/v1/emr-borrow  （auth:true，body 用 await c.req.json()）申请借阅
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  canBorrow,
  computeReturnDueDate,
  type BorrowRecordV14,
} from "../aggregators/emrBorrowV14Aggregator.js";

/** 内存态借阅记录集（演示用，生产环境应持久化） */
let borrowState: BorrowRecordV14[] = [
  { id: "B001", patientName: "张三", medicalRecordNumber: "ZY20261001001", status: "available" },
  { id: "B002", patientName: "李四", medicalRecordNumber: "ZY20261002002", status: "borrowed", appliedAt: "2026-10-15T00:00:00Z", dueDate: "2026-10-22T00:00:00Z" },
];

export const emrBorrowV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-borrow",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-borrow:read");
      if (denied) return denied;
      void new URL(c.req.url).searchParams.get("unused");
      return json(ok({ records: borrowState }));
    },
  },
  {
    method: "POST",
    path: "/api/v1/emr-borrow",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-borrow:write");
      if (denied) return denied;
      const body = await c.req.json().catch(() => ({})) as {
        patientName?: string;
        medicalRecordNumber?: string;
        reason?: string;
      };
      const record: BorrowRecordV14 = {
        id: `B${Date.now()}`,
        patientName: body.patientName ?? "未知患者",
        medicalRecordNumber: body.medicalRecordNumber ?? "未知病历号",
        status: "available",
      };
      const check = canBorrow(record);
      if (!check.borrowable) return json(ok({ error: check.reason }));
      const appliedAt = new Date().toISOString();
      const updated: BorrowRecordV14 = {
        ...record,
        status: "borrowed",
        appliedAt,
        dueDate: computeReturnDueDate(appliedAt, 7),
      };
      borrowState = [...borrowState, updated];
      return json(ok({ record: updated }));
    },
  },
];
