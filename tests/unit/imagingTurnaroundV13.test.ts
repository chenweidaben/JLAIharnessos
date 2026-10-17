/**
 * 健澜科技 jlmedaios - 影像报告周转时间 V13 单测（M338-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCTTATV13,
  computeMRITATV13,
  computeXRayTATV13,
  type ImagingTurnaroundRecordV13,
} from "../../src/bff/aggregators/imagingTurnaroundV13Aggregator";
import { imagingTurnaroundV13Routes } from "../../src/bff/routes/imagingTurnaroundV13";

const records: ImagingTurnaroundRecordV13[] = [
  { xrayTATHours: 1, ctTATHours: 2, mriTATHours: 3 },
  { xrayTATHours: 2, ctTATHours: 4, mriTATHours: 6 },
  { xrayTATHours: 3, ctTATHours: 6, mriTATHours: 9 },
];

describe("computeXRayTATV13", () => {
  // 算式：(1+2+3)/3 = 6/3 = 2.0
  it("X 线 TAT = 2.0 小时", () => {
    expect(computeXRayTATV13(records)).toBe(2.0);
  });
  it("空态 → 0", () => {
    expect(computeXRayTATV13([])).toBe(0);
  });
});

describe("computeCTTATV13", () => {
  // 算式：(2+4+6)/3 = 12/3 = 4.0
  it("CT TAT = 4.0 小时", () => {
    expect(computeCTTATV13(records)).toBe(4.0);
  });
});

describe("computeMRITATV13", () => {
  // 算式：(3+6+9)/3 = 18/3 = 6.0
  it("MRI TAT = 6.0 小时", () => {
    expect(computeMRITATV13(records)).toBe(6.0);
  });
});

describe("imagingTurnaroundV13Routes 读路由", () => {
  it("GET /api/v1/imaging-turnaround 路由存在且 auth:true", () => {
    const route = imagingTurnaroundV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/imaging-turnaround",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
