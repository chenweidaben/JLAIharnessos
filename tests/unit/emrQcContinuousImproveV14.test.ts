/**
 * 健澜科技 jlmedaios - 病历质控持续改进 V14 单测（M479-D，M479 收官）
 *
 * 测试 buildImprovementPlan 构建、trackImprovementProgress 进度跟踪、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildImprovementPlan,
  trackImprovementProgress,
  type ImprovementPlanV14,
} from "../../src/bff/aggregators/emrQcContinuousImproveV14Aggregator";
import { emrQcContinuousImproveV14Routes } from "../../src/bff/routes/emrQcContinuousImproveV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildImprovementPlan 构建", () => {
  // 手算：defect='病历缺失现病史', measure='加强书写培训', owner='张医生' → 正确构建
  it("defect=病历缺失现病史, measure=加强书写培训, owner=张医生 → 正确构建", () => {
    const plan: ImprovementPlanV14 = buildImprovementPlan("病历缺失现病史", "加强书写培训", "张医生");
    expect(plan.defect).toBe("病历缺失现病史");
    expect(plan.measure).toBe("加强书写培训");
    expect(plan.owner).toBe("张医生");
  });
});

describe("trackImprovementProgress 60", () => {
  // 手算：completedSteps=3, totalSteps=5 → 3/5×100 = 60
  it("completedSteps=3, totalSteps=5 → progress=60", () => {
    const plan: ImprovementPlanV14 = buildImprovementPlan("缺陷", "措施", "张医生");
    const result = trackImprovementProgress(plan, 3, 5);
    expect(result.progress).toBe(60);
  });
});

describe("trackImprovementProgress 100", () => {
  // 手算：completedSteps=5, totalSteps=5 → 5/5×100 = 100，status=已完成
  it("completedSteps=5, totalSteps=5 → progress=100, status=已完成", () => {
    const plan: ImprovementPlanV14 = buildImprovementPlan("缺陷", "措施", "张医生");
    const result = trackImprovementProgress(plan, 5, 5);
    expect(result.progress).toBe(100);
    expect(result.status).toBe("已完成");
  });
});

describe("trackImprovementProgress 0", () => {
  // 手算：completedSteps=0, totalSteps=5 → 0/5×100 = 0
  it("completedSteps=0, totalSteps=5 → progress=0", () => {
    const plan: ImprovementPlanV14 = buildImprovementPlan("缺陷", "措施", "张医生");
    const result = trackImprovementProgress(plan, 0, 5);
    expect(result.progress).toBe(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-continuous-improve auth:true", () => {
    const def = (emrQcContinuousImproveV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-continuous-improve");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
