/**
 * 健澜科技 jlmedaios - 月子中心与产后康复 V5 单测（M274-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessPostpartumRecoveryV5,
  buildPostpartumCareV5Report,
  monitorNewbornV5,
} from "../../src/bff/aggregators/postpartumCareV5ReportAggregator";

describe("assessPostpartumRecoveryV5", () => {
  it("四项均5分→score=20 良好", () => {
    expect(assessPostpartumRecoveryV5({ wound: 5, lochia: 5, uterus: 5, emotion: 5 }).score).toBe(20);
  });
});

describe("monitorNewbornV5", () => {
  it("黄疸16→异常且告警", () => {
    expect(monitorNewbornV5({ jaundice: 16, temp: 37, feeding: 5 }).alert).toBe(true);
  });
});

describe("buildPostpartumCareV5Report", () => {
  it("生成入住数据", () => {
    expect(buildPostpartumCareV5Report("30d").admission.motherBabyBed).toBeGreaterThan(0);
  });
  it("生成产妇照护数据", () => {
    expect(buildPostpartumCareV5Report("30d").motherCare.wound).toBeGreaterThan(0);
  });
  it("生成建议", () => {
    expect(buildPostpartumCareV5Report("30d").suggestions.length).toBeGreaterThan(0);
  });
});
