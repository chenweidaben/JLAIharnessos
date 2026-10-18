/**
 * 健澜科技 jlmedaios - 病历缺陷统计分析 V14 单测（M461-B）
 *
 * 测试 aggregateDefectsByType、aggregateDefectsByDept、空数组返回全 0、total 一致性、读路由 GET auth:true。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateDefectsByDept,
  aggregateDefectsByType,
  type DefectRecordV14,
} from "../../src/bff/aggregators/emrDefectStatsV14Aggregator";
import { emrDefectStatsV14Routes } from "../../src/bff/routes/emrDefectStatsV14";
import type { RouteDef } from "../../src/bff/types";

describe("aggregateDefectsByType", () => {
  // 手算：2 block + 3 major + 5 minor → total = 2+3+5 = 10
  it("2 block + 3 major + 5 minor → total=10", () => {
    const records: DefectRecordV14[] = [
      { recordId: "D001", dept: "心内科", severity: "block", foundAt: "2026-10-18T08:00:00Z" },
      { recordId: "D002", dept: "心内科", severity: "block", foundAt: "2026-10-18T09:00:00Z" },
      { recordId: "D003", dept: "普外科", severity: "major", foundAt: "2026-10-18T10:00:00Z" },
      { recordId: "D004", dept: "普外科", severity: "major", foundAt: "2026-10-18T11:00:00Z" },
      { recordId: "D005", dept: "骨科", severity: "major", foundAt: "2026-10-18T12:00:00Z" },
      { recordId: "D006", dept: "骨科", severity: "minor", foundAt: "2026-10-18T13:00:00Z" },
      { recordId: "D007", dept: "骨科", severity: "minor", foundAt: "2026-10-18T14:00:00Z" },
      { recordId: "D008", dept: "呼吸科", severity: "minor", foundAt: "2026-10-18T15:00:00Z" },
      { recordId: "D009", dept: "呼吸科", severity: "minor", foundAt: "2026-10-18T16:00:00Z" },
      { recordId: "D010", dept: "呼吸科", severity: "minor", foundAt: "2026-10-18T17:00:00Z" },
    ];
    const result = aggregateDefectsByType(records);
    expect(result.block).toBe(2);
    expect(result.major).toBe(3);
    expect(result.minor).toBe(5);
    expect(result.total).toBe(10);
  });
});

describe("aggregateDefectsByDept", () => {
  // 手算：心内科 2 条（1 block + 1 major）→ total=2
  it("按科室分组正确计数", () => {
    const records: DefectRecordV14[] = [
      { recordId: "D001", dept: "心内科", severity: "block", foundAt: "2026-10-18T08:00:00Z" },
      { recordId: "D002", dept: "心内科", severity: "major", foundAt: "2026-10-18T09:00:00Z" },
      { recordId: "D003", dept: "普外科", severity: "minor", foundAt: "2026-10-18T10:00:00Z" },
    ];
    const result = aggregateDefectsByDept(records);
    expect(result.length).toBe(2);
    const cardiology = result.find((r) => r.dept === "心内科");
    expect(cardiology?.block).toBe(1);
    expect(cardiology?.major).toBe(1);
    expect(cardiology?.total).toBe(2);
  });
});

describe("空数组", () => {
  it("空数组返回全 0", () => {
    const result = aggregateDefectsByType([]);
    expect(result.block).toBe(0);
    expect(result.major).toBe(0);
    expect(result.minor).toBe(0);
    expect(result.total).toBe(0);
    const byDept = aggregateDefectsByDept([]);
    expect(byDept.length).toBe(0);
  });
});

describe("total 一致性", () => {
  it("total = block + major + minor", () => {
    const records: DefectRecordV14[] = [
      { recordId: "D001", dept: "心内科", severity: "block", foundAt: "2026-10-18T08:00:00Z" },
      { recordId: "D002", dept: "心内科", severity: "major", foundAt: "2026-10-18T09:00:00Z" },
      { recordId: "D003", dept: "普外科", severity: "minor", foundAt: "2026-10-18T10:00:00Z" },
    ];
    const result = aggregateDefectsByType(records);
    expect(result.total).toBe(result.block + result.major + result.minor);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-defect-stats auth:true", () => {
    const def = (emrDefectStatsV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-defect-stats");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
