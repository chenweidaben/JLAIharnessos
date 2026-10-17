/**
 * 健澜科技 jlmedaios - AI 管理应用 V13 单测（M366-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAiOperationDecisionCountV13,
  computeAiResourceDispatchCountV13,
  computeAiWarningAccuracyRateV13,
  type AiManagementRecordV13,
} from "../../src/bff/aggregators/aiManagementV13Aggregator";
import { aiManagementV13Routes } from "../../src/bff/routes/aiManagementV13";

const records: AiManagementRecordV13[] = [
  { operationDecisionCount: 10, resourceDispatchCount: 15, warningTotal: 100, warningAccurate: 80 },
  { operationDecisionCount: 20, resourceDispatchCount: 25, warningTotal: 100, warningAccurate: 80 },
];

describe("computeAiOperationDecisionCountV13", () => {
  // 算式：10+20 = 30
  it("AI 运营决策数 = 30", () => {
    expect(computeAiOperationDecisionCountV13(records)).toBe(30);
  });
  it("空态 → 0", () => {
    expect(computeAiOperationDecisionCountV13([])).toBe(0);
  });
});

describe("computeAiResourceDispatchCountV13", () => {
  // 算式：15+25 = 40
  it("AI 资源调度次数 = 40", () => {
    expect(computeAiResourceDispatchCountV13(records)).toBe(40);
  });
});

describe("computeAiWarningAccuracyRateV13", () => {
  // 算式：(80+80)/(100+100) = 160/200×100 = 80.00
  it("AI 预警准确率 = 80.00%", () => {
    expect(computeAiWarningAccuracyRateV13(records)).toBe(80.00);
  });
});

describe("aiManagementV13Routes 读路由", () => {
  it("GET /api/v1/ai-management 路由存在且 auth:true", () => {
    const route = aiManagementV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/ai-management",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
