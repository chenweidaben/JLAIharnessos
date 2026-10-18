/**
 * 健澜科技 jlmedaios - 病历书写时限 SLA 实时监控 V14 单测（M461-A）
 *
 * 测试 dueAt 在未来 2 小时→on_time、dueAt 在未来 30 分钟→warning、dueAt 在过去→overdue、aggregateSlaList 统计、读路由 GET auth:true。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateSlaList,
  computeSlaStatus,
  type SlaRecordV14,
} from "../../src/bff/aggregators/emrSlaMonitorV14Aggregator";
import { emrSlaMonitorV14Routes } from "../../src/bff/routes/emrSlaMonitorV14";
import type { RouteDef } from "../../src/bff/types";

const NOW = "2026-10-18T10:00:00Z";

describe("on_time", () => {
  // 手算：dueAt=12:00（未来 120 分钟），warnMinutesBefore=60 → 120 > 60 → on_time
  it("dueAt 在未来 2 小时 → on_time", () => {
    const status = computeSlaStatus("2026-10-18T12:00:00Z", NOW);
    expect(status).toBe("on_time");
  });
});

describe("warning", () => {
  // 手算：dueAt=10:30（未来 30 分钟），warnMinutesBefore=60 → 30 < 60 → warning
  it("dueAt 在未来 30 分钟 → warning", () => {
    const status = computeSlaStatus("2026-10-18T10:30:00Z", NOW);
    expect(status).toBe("warning");
  });
});

describe("overdue", () => {
  // 手算：dueAt=09:00（过去 60 分钟），now > dueAt → overdue
  it("dueAt 在过去 → overdue", () => {
    const status = computeSlaStatus("2026-10-18T09:00:00Z", NOW);
    expect(status).toBe("overdue");
  });
});

describe("aggregateSlaList", () => {
  // 手算：3 条记录（1 on_time + 1 warning + 1 overdue）→ onTime=1, warning=1, overdue=1
  it("3 条记录 → onTime=1, warning=1, overdue=1", () => {
    const records: SlaRecordV14[] = [
      { recordId: "R001", recordType: "首次病程记录", patientName: "张三", dueAt: "2026-10-18T12:00:00Z" },
      { recordId: "R002", recordType: "上级医师查房", patientName: "李四", dueAt: "2026-10-18T10:30:00Z" },
      { recordId: "R003", recordType: "转科记录", patientName: "王五", dueAt: "2026-10-18T09:00:00Z" },
    ];
    const result = aggregateSlaList(records, NOW);
    expect(result.onTime).toBe(1);
    expect(result.warning).toBe(1);
    expect(result.overdue).toBe(1);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-sla-monitor auth:true", () => {
    const def = (emrSlaMonitorV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-sla-monitor");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
