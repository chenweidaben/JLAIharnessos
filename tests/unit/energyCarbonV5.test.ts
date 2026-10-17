/**
 * 健澜科技 jlmedaios - 能源碳排放与绿色医院 V5 单测（M279-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildEnergyCarbonV5Report,
  calculateCarbonV5,
  detectEnergyAnomalyV5,
  trackCarbonReductionV5,
  type EnergyUsage,
} from "../../src/bff/aggregators/energyCarbonV5Aggregator";

describe("calculateCarbonV5", () => {
  it("1000kWh电→580kg电碳", () => {
    const usage: EnergyUsage = { zone: "z", kwh: 1000, water: 0, gas: 0 };
    expect(calculateCarbonV5(usage).breakdown.electricity).toBe(580);
  });
  it("总碳=电+气+水", () => {
    const usage: EnergyUsage = { zone: "z", kwh: 1000, water: 10, gas: 100 };
    // 580 + 210 + 9.1 = 799.1
    expect(calculateCarbonV5(usage).carbonKg).toBe(799.1);
  });
});

describe("detectEnergyAnomalyV5", () => {
  it("用量超出基准30%→异常", () => {
    expect(detectEnergyAnomalyV5(130, 100).anomalous).toBe(true);
  });
  it("用量等于基准→正常", () => {
    expect(detectEnergyAnomalyV5(100, 100).anomalous).toBe(false);
  });
});

describe("trackCarbonReductionV5", () => {
  it("实际80000≤目标90000→达标", () => {
    expect(trackCarbonReductionV5(80000, 90000, 120000).onTrack).toBe(true);
  });
  it("基准120000实际96000→减排20%", () => {
    expect(trackCarbonReductionV5(96000, 90000, 120000).reductionPct).toBe(20);
  });
});

describe("buildEnergyCarbonV5Report", () => {
  it("汇总各区域碳排", () => {
    const usages: EnergyUsage[] = [
      { zone: "门诊楼", kwh: 1000, water: 0, gas: 0 },
      { zone: "住院部", kwh: 2000, water: 0, gas: 0 },
    ];
    const r = buildEnergyCarbonV5Report(usages, 2000, 1500);
    expect(r.byZone["门诊楼"]).toBe(580);
  });
});
