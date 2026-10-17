/**
 * 健澜科技 jlmedaios - 环境消毒合格率 V13 单测（M341-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDisinfectionPassRateV13,
  type EnvDisinfectionRecordV13,
} from "../../src/bff/aggregators/envDisinfectionV13Aggregator";
import { envDisinfectionV13Routes } from "../../src/bff/routes/envDisinfectionV13";

const records: EnvDisinfectionRecordV13[] = [
  { totalSampled: 100, passCount: 95 },
];

describe("computeDisinfectionPassRateV13", () => {
  // 算式：95/100×100 = 95.0
  it("环境消毒合格率 = 95.0%", () => {
    expect(computeDisinfectionPassRateV13(records)).toBe(95.0);
  });
  it("空态 → 0", () => {
    expect(computeDisinfectionPassRateV13([])).toBe(0);
  });
  it("采样总数为 0 → 0", () => {
    const zeroRecords: EnvDisinfectionRecordV13[] = [
      { totalSampled: 0, passCount: 0 },
    ];
    expect(computeDisinfectionPassRateV13(zeroRecords)).toBe(0);
  });
});

describe("envDisinfectionV13Routes 读路由", () => {
  it("GET /api/v1/env-disinfection 路由存在且 auth:true", () => {
    const route = envDisinfectionV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/env-disinfection",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
