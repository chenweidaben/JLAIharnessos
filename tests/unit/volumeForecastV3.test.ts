/**
 * 健澜科技 jlmedaios - 门诊与手术量预测 V3 单测（M277-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildVolumeForecastV3Report,
  detectAnomalyV3,
  forecastVolumeV3,
  recommendStaffingV3,
  type VolumeHistory,
} from "../../src/bff/aggregators/volumeForecastV3Aggregator";

const hist: VolumeHistory[] = [
  { date: "d1", actual: 120, weekday: 1, isHoliday: false },
  { date: "d2", actual: 130, weekday: 2, isHoliday: false },
  { date: "d3", actual: 110, weekday: 3, isHoliday: false },
];

describe("forecastVolumeV3", () => {
  it("horizon=7返回7个预测且周末下调", () => {
    const r = forecastVolumeV3(hist, 7);
    expect(r.length).toBe(7);
    expect(r[0].modelVersion).toBe("v3.0");
  });
});

describe("detectAnomalyV3", () => {
  it("实际200超出上限180→异常", () => {
    expect(detectAnomalyV3(200, { upper: 180, lower: 120 }).anomalous).toBe(true);
  });
  it("实际150在区间内→正常", () => {
    expect(detectAnomalyV3(150, { upper: 180, lower: 120 }).anomalous).toBe(false);
  });
});

describe("recommendStaffingV3", () => {
  it("预测160→高峰8医12护", () => {
    expect(recommendStaffingV3(160)).toEqual({ doctors: 8, nurses: 12, shift: "高峰" });
  });
});

describe("buildVolumeForecastV3Report", () => {
  it("生成看板并给排班", () => {
    const r = buildVolumeForecastV3Report("内科", forecastVolumeV3(hist, 7));
    expect(r.peakForecast).toBeGreaterThan(0);
    expect(r.staffing.shift).toBeTruthy();
  });
});
