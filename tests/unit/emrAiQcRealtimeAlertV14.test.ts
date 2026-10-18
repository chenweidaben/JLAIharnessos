/**
 * 健澜科技 jlmedaios - 病历AI质控实时预警 V14 单测（M549-A）
 *
 * 测试 buildAiQcRealtimeAlert 构建 AI 实时预警、checkQcRealtimeAlertByAi AI 实时预警检查、buildAiQcRealtimeAlertReport 构建实时预警报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiQcRealtimeAlert,
  buildAiQcRealtimeAlertReport,
  checkQcRealtimeAlertByAi,
  type AiQcRealtimeAlertInputV14,
} from "../../src/bff/aggregators/emrAiQcRealtimeAlertV14Aggregator";
import { emrAiQcRealtimeAlertV14Routes } from "../../src/bff/routes/emrAiQcRealtimeAlertV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiQcRealtimeAlert 构建 AI 实时预警", () => {
  // 手算：recordId='RECB017', dept='内科' → 正确构建
  it("recordId='RECB017', dept='内科' → 正确构建", () => {
    const base = buildAiQcRealtimeAlert("RECB017", "内科");
    expect(base.recordId).toBe("RECB017");
    expect(base.dept).toBe("内科");
  });
});

describe("checkQcRealtimeAlertByAi 红色", () => {
  // 手算：{defectCount=20, threshold=5}
  // 手算：defectCount=20 > threshold=5 → triggered=true
  // 手算：defectCount=20 > threshold*2=10 → level='红色'
  it("{defectCount=20, threshold=5} → triggered=true, level='红色'", () => {
    const input: AiQcRealtimeAlertInputV14 = { defectCount: 20, threshold: 5 };
    const result = checkQcRealtimeAlertByAi(input);
    expect(result.triggered).toBe(true);
    expect(result.level).toBe("红色");
  });
});

describe("checkQcRealtimeAlertByAi 绿色", () => {
  // 手算：{defectCount=3, threshold=5}
  // 手算：defectCount=3 <= threshold=5 → triggered=false
  // 手算：triggered=false → level='绿色'
  it("{defectCount=3, threshold=5} → triggered=false, level='绿色'", () => {
    const input: AiQcRealtimeAlertInputV14 = { defectCount: 3, threshold: 5 };
    const result = checkQcRealtimeAlertByAi(input);
    expect(result.triggered).toBe(false);
    expect(result.level).toBe("绿色");
  });
});

describe("buildAiQcRealtimeAlertReport 构建实时预警报告", () => {
  // 手算：{triggered=true, level='红色'}
  // 手算：透传 triggered + level
  it("{triggered=true, level='红色'} → 正确返回（透传）", () => {
    const report = buildAiQcRealtimeAlertReport({ triggered: true, level: "红色" });
    expect(report.triggered).toBe(true);
    expect(report.level).toBe("红色");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-qc-realtime-alert auth:true", () => {
    const def = (emrAiQcRealtimeAlertV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-qc-realtime-alert");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
