/**
 * 健澜科技 jlmedaios - 病历AI质控异常监控 V14 单测（M549-B）
 *
 * 测试 buildAiQcAnomalyMonitor 构建 AI 异常监控、monitorQcAnomalyByAi AI 异常监控、buildAiQcAnomalyMonitorReport 构建异常监控报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiQcAnomalyMonitor,
  buildAiQcAnomalyMonitorReport,
  monitorQcAnomalyByAi,
  type AiQcAnomalyMonitorInputV14,
} from "../../src/bff/aggregators/emrAiQcAnomalyMonitorV14Aggregator";
import { emrAiQcAnomalyMonitorV14Routes } from "../../src/bff/routes/emrAiQcAnomalyMonitorV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiQcAnomalyMonitor 构建 AI 异常监控", () => {
  // 手算：recordId='RECB018', dept='医务处' → 正确构建
  it("recordId='RECB018', dept='医务处' → 正确构建", () => {
    const base = buildAiQcAnomalyMonitor("RECB018", "医务处");
    expect(base.recordId).toBe("RECB018");
    expect(base.dept).toBe("医务处");
  });
});

describe("monitorQcAnomalyByAi 异常升高", () => {
  // 手算：{currentDefect=15, avgDefect=5}
  // 手算：deviation = Math.round((15-5)/5*1000)/10 = Math.round(2000)/10 = 200.0
  // 手算：|200.0|=200 > 50 → isAnomaly=true
  it("{currentDefect=15, avgDefect=5} → deviation=200.0, isAnomaly=true", () => {
    const input: AiQcAnomalyMonitorInputV14 = { currentDefect: 15, avgDefect: 5 };
    const result = monitorQcAnomalyByAi(input);
    expect(result.deviation).toBe(200.0);
    expect(result.isAnomaly).toBe(true);
  });
});

describe("monitorQcAnomalyByAi 正常", () => {
  // 手算：{currentDefect=6, avgDefect=5}
  // 手算：deviation = Math.round((6-5)/5*1000)/10 = Math.round(200)/10 = 20.0
  // 手算：|20.0|=20 <= 50 → isAnomaly=false
  it("{currentDefect=6, avgDefect=5} → deviation=20.0, isAnomaly=false", () => {
    const input: AiQcAnomalyMonitorInputV14 = { currentDefect: 6, avgDefect: 5 };
    const result = monitorQcAnomalyByAi(input);
    expect(result.deviation).toBe(20.0);
    expect(result.isAnomaly).toBe(false);
  });
});

describe("buildAiQcAnomalyMonitorReport 构建异常监控报告", () => {
  // 手算：{isAnomaly=true, deviation=200.0}
  // 手算：透传 isAnomaly + deviation
  it("{isAnomaly=true, deviation=200.0} → 正确返回（透传）", () => {
    const report = buildAiQcAnomalyMonitorReport({ isAnomaly: true, deviation: 200.0 });
    expect(report.isAnomaly).toBe(true);
    expect(report.deviation).toBe(200.0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-qc-anomaly-monitor auth:true", () => {
    const def = (emrAiQcAnomalyMonitorV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-qc-anomaly-monitor");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
