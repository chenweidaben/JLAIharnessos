/**
 * 健澜科技 jlmedaios - 病历质控质控员工作台 V14 单测（M474-A，-desk 后缀避让）
 *
 * 测试 buildWorkbench 统计汇总、buildPendingList 降序排列、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildWorkbench,
  buildPendingList,
  type PendingNoteV14,
} from "../../src/bff/aggregators/emrQcWorkbenchDeskV14Aggregator";
import { emrQcWorkbenchDeskV14Routes } from "../../src/bff/routes/emrQcWorkbenchDeskV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildWorkbench 统计汇总", () => {
  // 手算：pending=5, inProgress=3, reviewed=12 → total = 5+3+12 = 20
  it("pending=5, inProgress=3, reviewed=12 → total=20", () => {
    const stats = buildWorkbench({ pending: 5, inProgress: 3, reviewed: 12 });
    expect(stats.total).toBe(20);
  });
});

describe("buildWorkbench 全零", () => {
  // 手算：pending=0, inProgress=0, reviewed=0 → total=0
  it("pending=0, inProgress=0, reviewed=0 → total=0", () => {
    const stats = buildWorkbench({ pending: 0, inProgress: 0, reviewed: 0 });
    expect(stats.total).toBe(0);
  });
});

describe("buildPendingList 降序", () => {
  // 手算：3 条笔记 submittedAt 分别为 2026-10-15 / 2026-10-16 / 2026-10-17
  // 降序：2026-10-17 > 2026-10-16 > 2026-10-15 → N3 排第一，N2 第二，N1 第三
  it("3 条笔记按 submittedAt 降序排列", () => {
    const notes: PendingNoteV14[] = [
      { id: "N1", patientName: "张三", dept: "内科", submittedAt: "2026-10-15T08:00:00Z" },
      { id: "N2", patientName: "李四", dept: "外科", submittedAt: "2026-10-16T09:00:00Z" },
      { id: "N3", patientName: "王五", dept: "儿科", submittedAt: "2026-10-17T10:00:00Z" },
    ];
    const sorted = buildPendingList(notes);
    expect(sorted[0]?.id).toBe("N3");
    expect(sorted[2]?.id).toBe("N1");
  });
});

describe("buildPendingList 空数组", () => {
  // 手算：空数组 → 返回空数组
  it("空数组 → 返回空数组", () => {
    expect(buildPendingList([])).toEqual([]);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-workbench-desk auth:true", () => {
    const def = (emrQcWorkbenchDeskV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-workbench-desk");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
