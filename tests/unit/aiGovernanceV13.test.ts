/**
 * 健澜科技 jlmedaios - AI 治理台账 V13 单测（M325-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  countPendingApprovalV13,
  countRollbackTimesV13,
  listDeployedAiModelsV13,
  type AiModelRecordV13,
} from "../../src/bff/aggregators/aiGovernanceV13Aggregator";
import { aiGovernanceV13Routes } from "../../src/bff/routes/aiGovernanceV13";

const models: AiModelRecordV13[] = [
  { modelName: "影像 AI", version: "v2.3.1", deployDate: "2026-09-01", isPendingApproval: false, rollbackCount: 1 },
  { modelName: "检验 AI", version: "v1.8.0", deployDate: "2026-09-15", isPendingApproval: false, rollbackCount: 0 },
  { modelName: "病历 AI", version: "v3.0.0-beta", deployDate: "2026-10-01", isPendingApproval: true, rollbackCount: 1 },
];

describe("listDeployedAiModelsV13", () => {
  // 算式：3 个模型
  it("清单 = 3 个模型", () => {
    expect(listDeployedAiModelsV13(models).length).toBe(3);
  });
  it("空态 → []", () => {
    expect(listDeployedAiModelsV13([]).length).toBe(0);
  });
});

describe("countPendingApprovalV13", () => {
  // 算式：1 个待批
  it("待批数 = 1", () => {
    expect(countPendingApprovalV13(models)).toBe(1);
  });
});

describe("countRollbackTimesV13", () => {
  // 算式：1+0+1 = 2
  it("回滚次数 = 2", () => {
    expect(countRollbackTimesV13(models)).toBe(2);
  });
});

describe("aiGovernanceV13Routes 读路由", () => {
  it("GET /api/v1/ai-governance 路由存在且 auth:true", () => {
    const route = aiGovernanceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/ai-governance",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
