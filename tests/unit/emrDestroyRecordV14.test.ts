/**
 * 健澜科技 jlmedaios - 病历销毁记录 V14 单测（M482-D，M482 收官）
 *
 * 测试 buildDestroyRecord 构建、checkDestroyEligibility 资格检查、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDestroyRecord,
  checkDestroyEligibility,
  type DestroyRecordV14,
} from "../../src/bff/aggregators/emrDestroyRecordV14Aggregator";
import { emrDestroyRecordV14Routes } from "../../src/bff/routes/emrDestroyRecordV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDestroyRecord 构建", () => {
  // 手算：medicalRecordId='MR001', reason='保存期满', destroyDate='2026-10-18' → 正确构建
  it("medicalRecordId=MR001, reason=保存期满, destroyDate=2026-10-18 → 正确构建", () => {
    const record: DestroyRecordV14 = buildDestroyRecord("MR001", "保存期满", "2026-10-18");
    expect(record.medicalRecordId).toBe("MR001");
    expect(record.reason).toBe("保存期满");
    expect(record.destroyDate).toBe("2026-10-18");
  });
});

describe("checkDestroyEligibility 满期", () => {
  // 手算：recordAgeYears=30, retentionYears=30 → 30>=30 → true
  it("recordAgeYears=30, retentionYears=30 → true", () => {
    expect(checkDestroyEligibility(30, 30)).toBe(true);
  });
});

describe("checkDestroyEligibility 未满期", () => {
  // 手算：recordAgeYears=20, retentionYears=30 → 20<30 → false
  it("recordAgeYears=20, retentionYears=30 → false", () => {
    expect(checkDestroyEligibility(20, 30)).toBe(false);
  });
});

describe("checkDestroyEligibility 超期", () => {
  // 手算：recordAgeYears=35, retentionYears=30 → 35>=30 → true
  it("recordAgeYears=35, retentionYears=30 → true", () => {
    expect(checkDestroyEligibility(35, 30)).toBe(true);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-destroy-record auth:true", () => {
    const def = (emrDestroyRecordV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-destroy-record");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
