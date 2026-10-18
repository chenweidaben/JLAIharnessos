/**
 * 健澜科技 jlmedaios - 病历质控自动派单 V14 单测（M521-B）
 *
 * 测试 buildAutoDispatch 构建派单、dispatchQcTask 自动派单、buildAutoDispatchReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAutoDispatch,
  buildAutoDispatchReport,
  dispatchQcTask,
  type AssigneeV14,
} from "../../src/bff/aggregators/emrQcAutoDispatchV14Aggregator";
import { emrQcAutoDispatchV14Routes } from "../../src/bff/routes/emrQcAutoDispatchV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAutoDispatch 构建派单", () => {
  // 手算：recordId='REC022', dept='普外科', defectLevel='major' → 正确构建
  it("recordId='REC022', dept='普外科', defectLevel='major' → 正确构建", () => {
    const dispatch = buildAutoDispatch("REC022", "普外科", "major");
    expect(dispatch.recordId).toBe("REC022");
    expect(dispatch.dept).toBe("普外科");
    expect(dispatch.defectLevel).toBe("major");
  });
});

describe("dispatchQcTask 最低负载优先", () => {
  // 手算：assignees=[{name:'张医生',workload:5},{name:'李医生',workload:3}]
  // 手算：李医生 workload=3 最低 → assignedTo='李医生'
  // 手算：派单后 workload=3+1=4
  it("task={...}, assignees=[{name:'张医生',workload:5},{name:'李医生',workload:3}] → assignedTo='李医生', workload=4", () => {
    const task = buildAutoDispatch("REC022", "普外科", "major");
    const assignees: AssigneeV14[] = [
      { name: "张医生", workload: 5 },
      { name: "李医生", workload: 3 },
    ];
    const result = dispatchQcTask(task, assignees);
    expect(result.assignedTo).toBe("李医生");
    expect(result.workload).toBe(4);
  });
});

describe("dispatchQcTask 平摊取第一个", () => {
  // 手算：assignees=[{name:'张医生',workload:4},{name:'李医生',workload:4}]
  // 手算：两人 workload 相等，取第一个 → assignedTo='张医生'
  it("assignees=[{name:'张医生',workload:4},{name:'李医生',workload:4}] → assignedTo='张医生'", () => {
    const task = buildAutoDispatch("REC022", "普外科", "major");
    const assignees: AssigneeV14[] = [
      { name: "张医生", workload: 4 },
      { name: "李医生", workload: 4 },
    ];
    const result = dispatchQcTask(task, assignees);
    expect(result.assignedTo).toBe("张医生");
  });
});

describe("buildAutoDispatchReport 构建报告", () => {
  // 手算：{assignedTo='李医生', workload:4} → 正确返回（透传）
  it("{assignedTo='李医生', workload:4} → 正确返回", () => {
    const report = buildAutoDispatchReport({ assignedTo: "李医生", workload: 4 });
    expect(report.assignedTo).toBe("李医生");
    expect(report.workload).toBe(4);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-auto-dispatch auth:true", () => {
    const def = (emrQcAutoDispatchV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-auto-dispatch");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
