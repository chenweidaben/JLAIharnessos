/**
 * 健澜科技 jlmedaios - 病历质控质控员工作台 V14 路由（M474-A，-desk 后缀避让）
 *
 * GET /api/v1/emr-qc-workbench-desk  （read，auth:true）返回工作台统计+待审列表
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  buildWorkbench,
  buildPendingList,
  type PendingNoteV14,
} from "../aggregators/emrQcWorkbenchDeskV14Aggregator.js";

const demoNotes: PendingNoteV14[] = [
  { id: "N1", patientName: "张三", dept: "内科", submittedAt: "2026-10-15T08:00:00Z" },
  { id: "N2", patientName: "李四", dept: "外科", submittedAt: "2026-10-16T09:00:00Z" },
  { id: "N3", patientName: "王五", dept: "儿科", submittedAt: "2026-10-17T10:00:00Z" },
];

export const emrQcWorkbenchDeskV14Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/emr-qc-workbench-desk",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "emr-qc-workbench-desk:read");
      if (denied) return denied;
      const stats = buildWorkbench({ pending: 5, inProgress: 3, reviewed: 12 });
      const pendingList = buildPendingList(demoNotes);
      return json(ok({ stats, pendingList }));
    },
  },
];
