/**
 * 健澜科技 jlmedaios - 病历归档规则 V14 单测（M478-B）
 *
 * 测试 buildArchiveRule 构建、checkArchiveEligibility 资格检查、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildArchiveRule,
  checkArchiveEligibility,
  type ArchiveRuleV14,
  type ArchiveEligibilityRecordV14,
} from "../../src/bff/aggregators/emrArchiveRuleV14Aggregator";
import { emrArchiveRuleV14Routes } from "../../src/bff/routes/emrArchiveRuleV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildArchiveRule 构建", () => {
  // 手算：name='出院后30天归档', condition='daysSinceDischarge>=30', retentionYears=30 → 正确构建
  it("name=出院后30天归档, condition=daysSinceDischarge>=30, retentionYears=30 → 正确构建", () => {
    const rule = buildArchiveRule("出院后30天归档", "daysSinceDischarge>=30", 30);
    expect(rule.name).toBe("出院后30天归档");
    expect(rule.condition).toBe("daysSinceDischarge>=30");
    expect(rule.retentionYears).toBe(30);
  });
});

describe("checkArchiveEligibility 符合条件", () => {
  // 手算：daysSinceDischarge=45 (>=30) + reviewed=true → true
  it("daysSinceDischarge=45, reviewed=true → 符合条件 → true", () => {
    const record: ArchiveEligibilityRecordV14 = { daysSinceDischarge: 45, reviewed: true };
    const rule: ArchiveRuleV14 = buildArchiveRule("出院后30天归档", "daysSinceDischarge>=30", 30);
    expect(checkArchiveEligibility(record, rule)).toBe(true);
  });
});

describe("checkArchiveEligibility 未到30天", () => {
  // 手算：daysSinceDischarge=10 (<30) + reviewed=true → false
  it("daysSinceDischarge=10, reviewed=true → 不符合 → false", () => {
    const record: ArchiveEligibilityRecordV14 = { daysSinceDischarge: 10, reviewed: true };
    const rule: ArchiveRuleV14 = buildArchiveRule("出院后30天归档", "daysSinceDischarge>=30", 30);
    expect(checkArchiveEligibility(record, rule)).toBe(false);
  });
});

describe("checkArchiveEligibility 未审核", () => {
  // 手算：daysSinceDischarge=45 (>=30) + reviewed=false → false
  it("daysSinceDischarge=45, reviewed=false → 未审核 → false", () => {
    const record: ArchiveEligibilityRecordV14 = { daysSinceDischarge: 45, reviewed: false };
    const rule: ArchiveRuleV14 = buildArchiveRule("出院后30天归档", "daysSinceDischarge>=30", 30);
    expect(checkArchiveEligibility(record, rule)).toBe(false);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-archive-rule auth:true", () => {
    const def = (emrArchiveRuleV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-archive-rule");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
