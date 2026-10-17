/**
 * 健澜科技 jlmedaios - 患者等候时长 V13 单测（M326-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildWaitTimeOverviewV13,
  computeWaitTimeByStageV13,
  flagOverdueStageV13,
  type WaitTimeRecordV13,
} from "../../src/bff/aggregators/patientWaitTimeV13Aggregator";
import { patientWaitTimeV13Routes } from "../../src/bff/routes/patientWaitTimeV13";

const records: WaitTimeRecordV13[] = [
  { stage: "registration", minutes: 3 },
  { stage: "registration", minutes: 4 },
  { stage: "registration", minutes: 5 },
  { stage: "registration", minutes: 6 },
  { stage: "registration", minutes: 7 },
  { stage: "waiting", minutes: 25 },
  { stage: "waiting", minutes: 30 },
  { stage: "waiting", minutes: 20 },
  { stage: "waiting", minutes: 35 },
  { stage: "waiting", minutes: 40 },
  { stage: "payment", minutes: 5 },
  { stage: "payment", minutes: 8 },
  { stage: "payment", minutes: 10 },
  { stage: "payment", minutes: 12 },
  { stage: "payment", minutes: 15 },
  { stage: "pharmacy", minutes: 10 },
  { stage: "pharmacy", minutes: 15 },
  { stage: "pharmacy", minutes: 20 },
  { stage: "pharmacy", minutes: 25 },
  { stage: "pharmacy", minutes: 30 },
];

describe("computeWaitTimeByStageV13", () => {
  // 算式：挂号 (3+4+5+6+7)/5 = 25/5 = 5
  it("挂号 = 5 分钟", () => {
    const stages = computeWaitTimeByStageV13(records);
    expect(stages.find((s) => s.stage === "registration")?.avgMinutes).toBe(5);
  });
  // 算式：候诊 (25+30+20+35+40)/5 = 150/5 = 30.0
  it("候诊 = 30.0 分钟", () => {
    const stages = computeWaitTimeByStageV13(records);
    expect(stages.find((s) => s.stage === "waiting")?.avgMinutes).toBe(30.0);
  });
  it("空态 → 4 环节均 0", () => {
    const stages = computeWaitTimeByStageV13([]);
    expect(stages.length).toBe(4);
    expect(stages[0].avgMinutes).toBe(0);
  });
});

describe("flagOverdueStageV13", () => {
  // 算式：35 > 30 → 红牌
  it("35 分钟 → 红牌", () => {
    expect(flagOverdueStageV13("waiting", 35)).toBe(true);
  });
  // 算式：30 不 > 30 → 不红
  it("30 分钟 → 不红牌", () => {
    expect(flagOverdueStageV13("waiting", 30)).toBe(false);
  });
});

describe("buildWaitTimeOverviewV13", () => {
  // 算式：4 环节
  it("总览 = 4 环节", () => {
    const overview = buildWaitTimeOverviewV13(records);
    expect(overview.stages.length).toBe(4);
  });
});

describe("patientWaitTimeV13Routes 读路由", () => {
  it("GET /api/v1/patient-wait-time 路由存在且 auth:true", () => {
    const route = patientWaitTimeV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-wait-time",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
