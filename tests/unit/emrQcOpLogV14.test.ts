/**
 * 健澜科技 jlmedaios - 病历质控操作日志 V14 单测（M473-C）
 *
 * 测试 recordOpLog 记录日志、filterOpLogs 按条件过滤、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  recordOpLog,
  filterOpLogs,
  type OpLogV14,
} from "../../src/bff/aggregators/emrQcOpLogV14Aggregator";
import { emrQcOpLogV14Routes } from "../../src/bff/routes/emrQcOpLogV14";
import type { RouteDef } from "../../src/bff/types";

describe("recordOpLog 记录日志", () => {
  // 手算：operator='张三', action='审核', target='病历001' → 返回的 log 含 timestamp（ISO 字符串非空）
  it("operator='张三', action='审核', target='病历001' → 返回的 log 含 timestamp", () => {
    const log = recordOpLog("张三", "审核", "病历001");
    expect(log.operator).toBe("张三");
    expect(log.action).toBe("审核");
    expect(log.target).toBe("病历001");
    expect(log.timestamp).toBeTruthy();
  });
});

describe("filterOpLogs 按操作人过滤", () => {
  // 手算：3 条日志（2 条 operator=张三, 1 条 operator=李四）→ filter({operator:'张三'}) 返回 2 条
  it("3 条日志（2 条 operator=张三, 1 条 operator=李四）→ filter({operator:'张三'}) 返回 2 条", () => {
    const logs: OpLogV14[] = [
      { id: "L1", operator: "张三", action: "审核", target: "T1", timestamp: "2026-10-01T08:00:00Z" },
      { id: "L2", operator: "张三", action: "驳回", target: "T2", timestamp: "2026-10-02T09:00:00Z" },
      { id: "L3", operator: "李四", action: "审核", target: "T3", timestamp: "2026-10-03T10:00:00Z" },
    ];
    const filtered = filterOpLogs(logs, { operator: "张三" });
    expect(filtered.length).toBe(2);
  });
});

describe("filterOpLogs 按动作过滤", () => {
  // 手算：filter({action:'审核'}) → 返回含审核动作的日志（L1, L3 → 2 条）
  it("filter({action:'审核'}) → 返回含审核动作的日志", () => {
    const logs: OpLogV14[] = [
      { id: "L1", operator: "张三", action: "审核", target: "T1", timestamp: "2026-10-01T08:00:00Z" },
      { id: "L2", operator: "张三", action: "驳回", target: "T2", timestamp: "2026-10-02T09:00:00Z" },
      { id: "L3", operator: "李四", action: "审核", target: "T3", timestamp: "2026-10-03T10:00:00Z" },
    ];
    const filtered = filterOpLogs(logs, { action: "审核" });
    expect(filtered.length).toBe(2);
  });
});

describe("filterOpLogs 空 filter", () => {
  // 手算：空 filter → 返回全部 3 条
  it("空 filter → 返回全部 3 条", () => {
    const logs: OpLogV14[] = [
      { id: "L1", operator: "张三", action: "审核", target: "T1", timestamp: "2026-10-01T08:00:00Z" },
      { id: "L2", operator: "张三", action: "驳回", target: "T2", timestamp: "2026-10-02T09:00:00Z" },
      { id: "L3", operator: "李四", action: "审核", target: "T3", timestamp: "2026-10-03T10:00:00Z" },
    ];
    expect(filterOpLogs(logs, {}).length).toBe(3);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-op-log auth:true", () => {
    const def = (emrQcOpLogV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-op-log");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
