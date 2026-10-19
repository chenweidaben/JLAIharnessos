/**
 * 健澜科技 jlmedaios - 病历AI术后病程跟踪 V14 单测（M555-C）
 *
 * 测试 buildAiPostopProgressTrack 构建 AI 术后病程跟踪、trackPostopProgressByAi AI 术后病程跟踪、buildAiPostopProgressTrackReport 构建术后病程跟踪报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiPostopProgressTrack,
  buildAiPostopProgressTrackReport,
  trackPostopProgressByAi,
  type AiPostopProgressTrackInputV14,
} from "../../src/bff/aggregators/emrAiPostopProgressTrackV14Aggregator";
import { emrAiPostopProgressTrackV14Routes } from "../../src/bff/routes/emrAiPostopProgressTrackV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiPostopProgressTrack 构建 AI 术后病程跟踪", () => {
  // 手算：recordId='RECB043', dept='外科' → 正确构建
  it("recordId='RECB043', dept='外科' → 正确构建", () => {
    const base = buildAiPostopProgressTrack("RECB043", "外科");
    expect(base.recordId).toBe("RECB043");
    expect(base.dept).toBe("外科");
  });
});

describe("trackPostopProgressByAi 恢复良好", () => {
  // 手算：{postopDay=5, hasFever=false, woundHealed=true}
  // 手算：!woundHealed=false, hasFever=false → recoveryStatus='恢复良好'
  // 手算：daysToDischarge = Math.max(1, 7-5) = Math.max(1, 2) = 2
  it("{postopDay=5, hasFever=false, woundHealed=true} → recoveryStatus='恢复良好', daysToDischarge=2", () => {
    const input: AiPostopProgressTrackInputV14 = { postopDay: 5, hasFever: false, woundHealed: true };
    const result = trackPostopProgressByAi(input);
    expect(result.recoveryStatus).toBe("恢复良好");
    expect(result.daysToDischarge).toBe(2);
  });
});

describe("trackPostopProgressByAi 恢复中", () => {
  // 手算：{postopDay=3, hasFever=true, woundHealed=false}
  // 手算：!woundHealed=true → recoveryStatus='恢复中'
  // 手算：daysToDischarge = Math.max(3, 14-3) = Math.max(3, 11) = 11
  it("{postopDay=3, hasFever=true, woundHealed=false} → recoveryStatus='恢复中', daysToDischarge=11", () => {
    const input: AiPostopProgressTrackInputV14 = { postopDay: 3, hasFever: true, woundHealed: false };
    const result = trackPostopProgressByAi(input);
    expect(result.recoveryStatus).toBe("恢复中");
    expect(result.daysToDischarge).toBe(11);
  });
});

describe("buildAiPostopProgressTrackReport 构建术后病程跟踪报告", () => {
  // 手算：{recoveryStatus='恢复良好', daysToDischarge=2}
  // 手算：透传 recoveryStatus + daysToDischarge
  it("{recoveryStatus='恢复良好', daysToDischarge=2} → 正确返回（透传）", () => {
    const report = buildAiPostopProgressTrackReport({ recoveryStatus: "恢复良好", daysToDischarge: 2 });
    expect(report.recoveryStatus).toBe("恢复良好");
    expect(report.daysToDischarge).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-postop-progress-track auth:true", () => {
    const def = (emrAiPostopProgressTrackV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-postop-progress-track");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
