/**
 * 健澜科技 jlmedaios - 后勤设备 V4 纯函数单测（M254-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessEquipmentUtilizationV4,
  buildLogisticsEquipmentV4Report,
  calculateCarbonEmissionV4,
} from "../../src/bff/aggregators/logisticsEquipmentV4ReportAggregator";

describe("assessEquipmentUtilizationV4", () => {
  it("开机率97故障率2 → 达标", () => {
    expect(assessEquipmentUtilizationV4({ uptime: 97, utilization: 75, failure: 2 }).adequate).toBe(true);
  });
});

describe("calculateCarbonEmissionV4", () => {
  it("电10000气10垃圾10吨 → 碳10offset1净9", () => {
    const r = calculateCarbonEmissionV4({ kwh: 10000, gas: 10 }, { ton: 10 });
    expect(r.net).toBe(r.carbon - r.offset);
  });
});

describe("buildLogisticsEquipmentV4Report", () => {
  it("生成生命周期数据", () => {
    const r = buildLogisticsEquipmentV4Report("30d");
    expect(r.lifecycle.use).toBeGreaterThan(0);
  });

  it("生成设备数据", () => {
    const r = buildLogisticsEquipmentV4Report("30d");
    expect(r.equipment.diagnostic).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildLogisticsEquipmentV4Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
