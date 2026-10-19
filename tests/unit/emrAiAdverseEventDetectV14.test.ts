/**
 * 健澜科技 jlmedaios - 病历AI不良事件主动识别 V14 单测（M559-A）
 *
 * 测试 buildAiAdverseEventDetect 构建 AI 不良事件主动识别、detectAdverseEventByAi AI 不良事件主动识别、buildAiAdverseEventDetectReport 构建不良事件主动识别报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiAdverseEventDetect,
  buildAiAdverseEventDetectReport,
  detectAdverseEventByAi,
  type AiAdverseEventDetectInputV14,
} from "../../src/bff/aggregators/emrAiAdverseEventDetectV14Aggregator";
import { emrAiAdverseEventDetectV14Routes } from "../../src/bff/routes/emrAiAdverseEventDetectV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiAdverseEventDetect 构建 AI 不良事件主动识别", () => {
  // 手算：recordId='RECB058', dept='护理部' → 正确构建
  it("recordId='RECB058', dept='护理部' → 正确构建", () => {
    const base = buildAiAdverseEventDetect("RECB058", "护理部");
    expect(base.recordId).toBe("RECB058");
    expect(base.dept).toBe("护理部");
  });
});

describe("detectAdverseEventByAi 无事件", () => {
  // 手算：{hasFall=false, hasPressureUlcer=false, hasMedError=false, hasInfection=false}
  // 手算：eventCount = 0+0+0+0 = 0
  // 手算：level = 0>=2?... : 0===1?... : '无不良事件' = '无不良事件'
  it("{hasFall=false, hasPressureUlcer=false, hasMedError=false, hasInfection=false} → eventCount=0, level='无不良事件'", () => {
    const input: AiAdverseEventDetectInputV14 = { hasFall: false, hasPressureUlcer: false, hasMedError: false, hasInfection: false };
    const result = detectAdverseEventByAi(input);
    expect(result.eventCount).toBe(0);
    expect(result.level).toBe("无不良事件");
  });
});

describe("detectAdverseEventByAi 严重", () => {
  // 手算：{hasFall=true, hasPressureUlcer=true, hasMedError=false, hasInfection=false}
  // 手算：eventCount = 1+1+0+0 = 2
  // 手算：level = 2>=2 = '严重不良事件'
  it("{hasFall=true, hasPressureUlcer=true, hasMedError=false, hasInfection=false} → eventCount=2, level='严重不良事件'", () => {
    const input: AiAdverseEventDetectInputV14 = { hasFall: true, hasPressureUlcer: true, hasMedError: false, hasInfection: false };
    const result = detectAdverseEventByAi(input);
    expect(result.eventCount).toBe(2);
    expect(result.level).toBe("严重不良事件");
  });
});

describe("buildAiAdverseEventDetectReport 构建不良事件主动识别报告", () => {
  // 手算：{eventCount=0, level='无不良事件'}
  // 手算：透传 eventCount + level
  it("{eventCount=0, level='无不良事件'} → 正确返回（透传）", () => {
    const report = buildAiAdverseEventDetectReport({ eventCount: 0, level: "无不良事件" });
    expect(report.eventCount).toBe(0);
    expect(report.level).toBe("无不良事件");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-adverse-event-detect auth:true", () => {
    const def = (emrAiAdverseEventDetectV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-adverse-event-detect");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
