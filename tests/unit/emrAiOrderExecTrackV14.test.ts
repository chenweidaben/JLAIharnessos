/**
 * 健澜科技 jlmedaios - 病历AI医嘱执行追踪 V14 单测（M558-C）
 *
 * 测试 buildAiOrderExecTrack 构建 AI 医嘱执行追踪、trackOrderExecByAi AI 医嘱执行追踪、buildAiOrderExecTrackReport 构建医嘱执行追踪报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiOrderExecTrack,
  buildAiOrderExecTrackReport,
  trackOrderExecByAi,
  type AiOrderExecTrackInputV14,
} from "../../src/bff/aggregators/emrAiOrderExecTrackV14Aggregator";
import { emrAiOrderExecTrackV14Routes } from "../../src/bff/routes/emrAiOrderExecTrackV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiOrderExecTrack 构建 AI 医嘱执行追踪", () => {
  // 手算：recordId='RECB056', dept='内科' → 正确构建
  it("recordId='RECB056', dept='内科' → 正确构建", () => {
    const base = buildAiOrderExecTrack("RECB056", "内科");
    expect(base.recordId).toBe("RECB056");
    expect(base.dept).toBe("内科");
  });
});

describe("trackOrderExecByAi 良好", () => {
  // 手算：{totalOrders=100, executedOrders=98, overdueOrders=2}
  // 手算：execRate = Math.round(98/100*1000)/10 = Math.round(980)/10 = 98.0
  // 手算：overdueRate = Math.round(2/100*1000)/10 = Math.round(20)/10 = 2.0
  // 手算：status = 2.0>10=false, 98.0>=95=true → '执行良好'
  it("{totalOrders=100, executedOrders=98, overdueOrders=2} → execRate=98.0, overdueRate=2.0, status='执行良好'", () => {
    const input: AiOrderExecTrackInputV14 = { totalOrders: 100, executedOrders: 98, overdueOrders: 2 };
    const result = trackOrderExecByAi(input);
    expect(result.execRate).toBeCloseTo(98.0, 1);
    expect(result.overdueRate).toBeCloseTo(2.0, 1);
    expect(result.status).toBe("执行良好");
  });
});

describe("trackOrderExecByAi 逾期风险", () => {
  // 手算：{totalOrders=100, executedOrders=85, overdueOrders=15}
  // 手算：execRate = Math.round(85/100*1000)/10 = Math.round(850)/10 = 85.0
  // 手算：overdueRate = Math.round(15/100*1000)/10 = Math.round(150)/10 = 15.0
  // 手算：status = 15.0>10=true → '存在逾期风险'
  it("{totalOrders=100, executedOrders=85, overdueOrders=15} → execRate=85.0, overdueRate=15.0, status='存在逾期风险'", () => {
    const input: AiOrderExecTrackInputV14 = { totalOrders: 100, executedOrders: 85, overdueOrders: 15 };
    const result = trackOrderExecByAi(input);
    expect(result.execRate).toBeCloseTo(85.0, 1);
    expect(result.overdueRate).toBeCloseTo(15.0, 1);
    expect(result.status).toBe("存在逾期风险");
  });
});

describe("buildAiOrderExecTrackReport 构建医嘱执行追踪报告", () => {
  // 手算：{execRate=98.0, overdueRate=2.0, status='执行良好'}
  // 手算：透传 execRate + overdueRate + status
  it("{execRate=98.0, overdueRate=2.0, status='执行良好'} → 正确返回（透传）", () => {
    const report = buildAiOrderExecTrackReport({ execRate: 98.0, overdueRate: 2.0, status: "执行良好" });
    expect(report.execRate).toBeCloseTo(98.0, 1);
    expect(report.overdueRate).toBeCloseTo(2.0, 1);
    expect(report.status).toBe("执行良好");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-order-exec-track auth:true", () => {
    const def = (emrAiOrderExecTrackV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-order-exec-track");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
