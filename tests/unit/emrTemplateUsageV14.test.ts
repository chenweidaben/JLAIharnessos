/**
 * 健澜科技 jlmedaios - 病历模板使用统计 V14 单测（M468-C）
 *
 * 测试 aggregateTemplateUsage 聚合+修改率、rankTemplates 排名、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateTemplateUsage,
  rankTemplates,
  type TemplateUsageV14,
} from "../../src/bff/aggregators/emrTemplateUsageV14Aggregator";
import { emrTemplateUsageV14Routes } from "../../src/bff/routes/emrTemplateUsageV14";
import type { RouteDef } from "../../src/bff/types";

describe("aggregateTemplateUsage 修改率", () => {
  // 手算：T001 被用 3 次（2 修改+1 未修改）→ useCount=3, modifyCount=2, 2/3×100=66.67→Math.round=67
  it("T001 被用 3 次其中 2 次修改 → useCount=3, modifyCount=2, modifyRate=67", () => {
    const usages: TemplateUsageV14[] = [
      { templateId: "T001", used: true, modified: true },
      { templateId: "T001", used: true, modified: true },
      { templateId: "T001", used: true, modified: false },
    ];
    const aggregated = aggregateTemplateUsage(usages);
    expect(aggregated[0]?.useCount).toBe(3);
    expect(aggregated[0]?.modifyCount).toBe(2);
    expect(aggregated[0]?.modifyRate).toBe(67);
  });
});

describe("aggregateTemplateUsage 零修改", () => {
  // 手算：T002 被用 2 次 0 修改 → modifyRate=0
  it("T002 被用 2 次 0 修改 → modifyRate=0", () => {
    const usages: TemplateUsageV14[] = [
      { templateId: "T002", used: true, modified: false },
      { templateId: "T002", used: true, modified: false },
    ];
    const aggregated = aggregateTemplateUsage(usages);
    expect(aggregated[0]?.modifyRate).toBe(0);
  });
});

describe("aggregateTemplateUsage 空数组", () => {
  // 手算：空数组 → 返回空数组 []
  it("空数组 → 返回空数组", () => {
    expect(aggregateTemplateUsage([])).toEqual([]);
  });
});

describe("rankTemplates 排名", () => {
  // 手算：T001(useCount=5) > T002(useCount=3) → T001 rank=1
  it("T001(useCount=5)>T002(useCount=3) → T001 rank=1", () => {
    const usages: TemplateUsageV14[] = [
      { templateId: "T001", used: true, modified: false },
      { templateId: "T001", used: true, modified: false },
      { templateId: "T001", used: true, modified: false },
      { templateId: "T001", used: true, modified: false },
      { templateId: "T001", used: true, modified: false },
      { templateId: "T002", used: true, modified: false },
      { templateId: "T002", used: true, modified: false },
      { templateId: "T002", used: true, modified: false },
    ];
    const aggregated = aggregateTemplateUsage(usages);
    const ranked = rankTemplates(aggregated);
    expect(ranked[0]?.templateId).toBe("T001");
    expect(ranked[0]?.rank).toBe(1);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-template-usage auth:true", () => {
    const def = (emrTemplateUsageV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-template-usage");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
