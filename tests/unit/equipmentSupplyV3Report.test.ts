/**
 * 健澜科技 jlmedaios - 设备耗材 V3 纯函数单测（M243-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessEquipmentUtilization,
  buildEquipmentSupplyV3Report,
  traceUDIV3,
} from "../../src/bff/aggregators/equipmentSupplyV3ReportAggregator";

describe("assessEquipmentUtilization", () => {
  it("开机96%故障1.5% → 健康", () => {
    expect(assessEquipmentUtilization({ uptime: 96, utilization: 75, failure: 1.5 }).healthy).toBe(true);
  });
});

describe("traceUDIV3", () => {
  it("IMPL开头 → 二级追溯", () => {
    expect(traceUDIV3("IMPL001").level).toBe(2);
  });
});

describe("buildEquipmentSupplyV3Report", () => {
  it("生成生命周期数据", () => {
    const r = buildEquipmentSupplyV3Report("30d");
    expect(r.lifecycle.inUse).toBeGreaterThan(0);
  });

  it("生成SPD数据", () => {
    const r = buildEquipmentSupplyV3Report("30d");
    expect(r.spd.high).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildEquipmentSupplyV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
