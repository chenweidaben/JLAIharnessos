/**
 * 健澜科技 jlmedaios - 超声检查量 V13 单测（M342-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAbdominalCountV13,
  computeCardiovascularCountV13,
  computeObstetricsCountV13,
  type UltrasoundVolumeRecordV13,
} from "../../src/bff/aggregators/ultrasoundVolumeV13Aggregator";
import { ultrasoundVolumeV13Routes } from "../../src/bff/routes/ultrasoundVolumeV13";

const records: UltrasoundVolumeRecordV13[] = [
  { abdominalCount: 200, cardiovascularCount: 100, obstetricsCount: 80 },
  { abdominalCount: 300, cardiovascularCount: 150, obstetricsCount: 120 },
];

describe("computeAbdominalCountV13", () => {
  // 算式：200+300 = 500
  it("腹部超声月度例数 = 500", () => {
    expect(computeAbdominalCountV13(records)).toBe(500);
  });
  it("空态 → 0", () => {
    expect(computeAbdominalCountV13([])).toBe(0);
  });
});

describe("computeCardiovascularCountV13", () => {
  // 算式：100+150 = 250
  it("心血管超声月度例数 = 250", () => {
    expect(computeCardiovascularCountV13(records)).toBe(250);
  });
});

describe("computeObstetricsCountV13", () => {
  // 算式：80+120 = 200
  it("妇产超声月度例数 = 200", () => {
    expect(computeObstetricsCountV13(records)).toBe(200);
  });
});

describe("ultrasoundVolumeV13Routes 读路由", () => {
  it("GET /api/v1/ultrasound-volume 路由存在且 auth:true", () => {
    const route = ultrasoundVolumeV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/ultrasound-volume",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
