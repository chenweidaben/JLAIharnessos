/**
 * 健澜科技 jlmedaios - 院长指挥中心一屏总览 V13 单测（M311-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDeanCommandCenterV13,
  computeOverallScoreV13,
  identifyUrgentAlertV13,
  type CommandCenterInputV13,
} from "../../src/bff/aggregators/deanCommandCenterV13Aggregator";
import { deanCommandCenterV13Routes } from "../../src/bff/routes/deanCommandCenterV13";

const input: CommandCenterInputV13 = {
  flywheelScore: 68,
  closureRate: 65,
  satisfactionRate: 60,
  workloadHealth: 75,
  eventSafety: 80,
};

describe("buildDeanCommandCenterV13", () => {
  it("返回 5 维 + overallScore + redLightCount", () => {
    const card = buildDeanCommandCenterV13(input);
    expect(card.flywheelScore).toBe(68);
    expect(card.overallScore).toBe(computeOverallScoreV13(input));
    expect(card.redLightCount).toBe(0);
  });
  it("空态（全 50）→ 5 个红灯", () => {
    const card = buildDeanCommandCenterV13({
      flywheelScore: 50, closureRate: 50, satisfactionRate: 50, workloadHealth: 50, eventSafety: 50,
    });
    expect(card.redLightCount).toBe(5);
  });
});

describe("computeOverallScoreV13", () => {
  // 算式：(68+65+60+75+80)/5 = 348/5 = 69.6 → 四舍五入 70
  it("avg = 70", () => {
    expect(computeOverallScoreV13(input)).toBe(70);
  });
});

describe("identifyUrgentAlertV13", () => {
  // 算式：redLightCount=2 → "存在紧急风险"
  it("2 红灯 → 紧急风险", () => {
    const card = buildDeanCommandCenterV13({
      flywheelScore: 50, closureRate: 50, satisfactionRate: 70, workloadHealth: 70, eventSafety: 80,
    });
    expect(identifyUrgentAlertV13(card)).toBe("存在紧急风险");
  });
  // 算式：redLightCount=1 → "运行平稳"
  it("1 红灯 → 运行平稳", () => {
    const card = buildDeanCommandCenterV13({
      flywheelScore: 50, closureRate: 70, satisfactionRate: 70, workloadHealth: 70, eventSafety: 80,
    });
    expect(identifyUrgentAlertV13(card)).toBe("运行平稳");
  });
});

describe("deanCommandCenterV13Routes 读路由", () => {
  it("GET /api/v1/dean-command-center 路由存在且 auth:true", () => {
    const route = deanCommandCenterV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/dean-command-center",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
