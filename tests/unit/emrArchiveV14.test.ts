/**
 * 健澜科技 jlmedaios - 病历归档与封存管理 V14 单测（M462-B）
 *
 * 测试 isArchivable 出院10天→true、出院3天→false、computeArchiveDays 出院10天→10、出院7天半→Math.ceil→8、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeArchiveDays,
  isArchivable,
} from "../../src/bff/aggregators/emrArchiveV14Aggregator";
import { emrArchiveV14Routes } from "../../src/bff/routes/emrArchiveV14";
import type { RouteDef } from "../../src/bff/types";

const NOW = "2026-10-18T00:00:00Z";

describe("isArchivable 出院10天", () => {
  // 手算：出院 10 天前 = 2026-10-08，10 >= 7 → true
  it("出院 10 天前 → true", () => {
    expect(isArchivable("2026-10-08T00:00:00Z", NOW)).toBe(true);
  });
});

describe("isArchivable 出院3天", () => {
  // 手算：出院 3 天前 = 2026-10-15，3 < 7 → false
  it("出院 3 天前 → false", () => {
    expect(isArchivable("2026-10-15T00:00:00Z", NOW)).toBe(false);
  });
});

describe("computeArchiveDays 出院10天", () => {
  // 手算：2026-10-08 到 2026-10-18 = 10 整天 → Math.ceil(10) = 10
  it("出院 10 天前 → 10", () => {
    expect(computeArchiveDays("2026-10-08T00:00:00Z", NOW)).toBe(10);
  });
});

describe("computeArchiveDays 出院7天半", () => {
  // 手算：2026-10-10 12:00 到 2026-10-18 00:00 = 7.5 天 → Math.ceil(7.5) = 8
  it("出院 7 天半 → Math.ceil → 8", () => {
    expect(computeArchiveDays("2026-10-10T12:00:00Z", NOW)).toBe(8);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-archive auth:true", () => {
    const def = (emrArchiveV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-archive");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
