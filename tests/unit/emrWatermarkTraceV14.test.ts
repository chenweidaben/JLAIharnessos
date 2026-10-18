/**
 * 健澜科技 jlmedaios - 病历水印追踪 V14 单测（M528-C）
 *
 * 测试 buildWatermarkTrace 构建追踪、applyWatermark 水印应用、buildWatermarkTraceReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  applyWatermark,
  buildWatermarkTrace,
  buildWatermarkTraceReport,
  type WatermarkApplyInputV14,
} from "../../src/bff/aggregators/emrWatermarkTraceV14Aggregator";
import { emrWatermarkTraceV14Routes } from "../../src/bff/routes/emrWatermarkTraceV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildWatermarkTrace 构建追踪", () => {
  // 手算：recordId='REC052', watermarkText='内部使用' → 正确构建
  it("recordId='REC052', watermarkText='内部使用' → 正确构建", () => {
    const trace = buildWatermarkTrace("REC052", "内部使用");
    expect(trace.recordId).toBe("REC052");
    expect(trace.watermarkText).toBe("内部使用");
  });
});

describe("applyWatermark 应用", () => {
  // 手算：{recordId:'REC052', operator:'张医生', watermarkText:'内部使用'}
  // 手算：watermarkId = 'WM-' + 'REC052' = 'WM-REC052'
  // 手算：traceable = true
  it("{recordId:'REC052', operator:'张医生', watermarkText:'内部使用'} → watermarkId='WM-REC052', traceable=true", () => {
    const input: WatermarkApplyInputV14 = {
      recordId: "REC052",
      operator: "张医生",
      watermarkText: "内部使用",
    };
    const result = applyWatermark(input);
    expect(result.watermarkId).toBe("WM-REC052");
    expect(result.traceable).toBe(true);
  });
});

describe("applyWatermark 另一病历", () => {
  // 手算：{recordId:'REC053', operator:'李医生', watermarkText:'科研专用'}
  // 手算：watermarkId = 'WM-' + 'REC053' = 'WM-REC053'
  // 手算：traceable = true
  it("{recordId:'REC053', operator:'李医生', watermarkText:'科研专用'} → watermarkId='WM-REC053', traceable=true", () => {
    const input: WatermarkApplyInputV14 = {
      recordId: "REC053",
      operator: "李医生",
      watermarkText: "科研专用",
    };
    const result = applyWatermark(input);
    expect(result.watermarkId).toBe("WM-REC053");
    expect(result.traceable).toBe(true);
  });
});

describe("buildWatermarkTraceReport 构建报告", () => {
  // 手算：{watermarkId:'WM-REC052', traceable:true}
  // 手算：透传 watermarkId + traceable
  it("{watermarkId:'WM-REC052', traceable:true} → 正确返回（透传）", () => {
    const report = buildWatermarkTraceReport({ watermarkId: "WM-REC052", traceable: true });
    expect(report.watermarkId).toBe("WM-REC052");
    expect(report.traceable).toBe(true);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-watermark-trace auth:true", () => {
    const def = (emrWatermarkTraceV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-watermark-trace");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
