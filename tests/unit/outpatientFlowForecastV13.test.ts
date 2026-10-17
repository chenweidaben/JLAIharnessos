/**
 * 健澜科技 jlmedaios - 门诊流量预测与分时段建议 V13 单测（M313-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  forecastDailyOutpatientV13,
  forecastTimeSlotV13,
  suggestSlotAllocationV13,
  type OutpatientHistoryV13,
  type SlotWeightV13,
} from "../../src/bff/aggregators/outpatientFlowForecastV13Aggregator";
import { outpatientFlowForecastV13Routes } from "../../src/bff/routes/outpatientFlowForecastV13";

const history: OutpatientHistoryV13[] = [
  { dayOfWeek: 1, volume: 700 },
  { dayOfWeek: 1, volume: 800 },
  { dayOfWeek: 1, volume: 900 },
];

const slotWeights: SlotWeightV13[] = [
  { slot: "上午", weight: 0.5 },
  { slot: "下午", weight: 0.3 },
  { slot: "晚间", weight: 0.2 },
];

describe("forecastDailyOutpatientV13", () => {
  // 算式：3 个周一(1) 历史 700/800/900 → avg = (700+800+900)/3 = 800
  // days=7 → 返回 7 天，day1 volume=800
  it("day1 volume=800", () => {
    const f = forecastDailyOutpatientV13(history, 7);
    expect(f[0].dayOfWeek).toBe(1);
    expect(f[0].volume).toBe(800);
    expect(f.length).toBe(7);
  });
  it("空历史 → 0", () => {
    expect(forecastDailyOutpatientV13([], 7)[0].volume).toBe(0);
  });
});

describe("forecastTimeSlotV13", () => {
  // 算式：dailyTotal=800, slot 权重 0.5/0.3/0.2
  // 上午 = 800×0.5 = 400；下午 = 800×0.3 = 240；晚间 = 800×0.2 = 160
  it("上午 400 / 下午 240 / 晚间 160", () => {
    const slots = forecastTimeSlotV13(800, slotWeights);
    expect(slots[0].volume).toBe(400);
    expect(slots[1].volume).toBe(240);
    expect(slots[2].volume).toBe(160);
  });
});

describe("suggestSlotAllocationV13", () => {
  // 算式：3 时段 volume=400/240/160，avg=(400+240+160)/3=266.67
  // 400 ≥ 266.67 → 高峰加配；240 < 266.67 → 常规；160 < 266.67 → 常规
  it("上午高峰加配，下午/晚间常规", () => {
    const slots = forecastTimeSlotV13(800, slotWeights);
    const alloc = suggestSlotAllocationV13(slots);
    expect(alloc[0].suggestion).toBe("高峰加配号源");
    expect(alloc[1].suggestion).toBe("常规号源");
    expect(alloc[2].suggestion).toBe("常规号源");
  });
  it("空态 → []", () => {
    expect(suggestSlotAllocationV13([]).length).toBe(0);
  });
});

describe("outpatientFlowForecastV13Routes 读路由", () => {
  it("GET /api/v1/outpatient-flow-forecast 路由存在且 auth:true", () => {
    const route = outpatientFlowForecastV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/outpatient-flow-forecast",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
