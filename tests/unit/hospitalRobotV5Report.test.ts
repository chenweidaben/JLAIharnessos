/**
 * 健澜科技 jlmedaios - 医院机器人与自动化 V5 纯函数单测（M268-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessRobotUtilizationV5,
  buildHospitalRobotV5Report,
  dispatchRobotTaskV5,
} from "../../src/bff/aggregators/hospitalRobotV5ReportAggregator";

describe("dispatchRobotTaskV5", () => {
  it("2台可用机器人+3个任务(1高2常) → 分配2个未分配1个", () => {
    const r = dispatchRobotTaskV5(
      [{ id: "R1", available: true, battery: 80 }, { id: "R2", available: true, battery: 60 }],
      [{ id: "T1", type: "drug", priority: "high" }, { id: "T2", type: "food", priority: "normal" }, { id: "T3", type: "linen", priority: "normal" }]
    );
    expect(r.assignments.length).toBe(2);
  });
});

describe("assessRobotUtilizationV5", () => {
  it("机器人利用率75%+在线 → 良好", () => {
    expect(assessRobotUtilizationV5({ id: "R1", utilization: 75, online: true }).level).toBe("良好");
  });
});

describe("buildHospitalRobotV5Report", () => {
  it("生成物流机器人数据", () => {
    const r = buildHospitalRobotV5Report("30d");
    expect(r.logistics.specimen).toBeGreaterThan(0);
  });

  it("生成消毒机器人数据", () => {
    const r = buildHospitalRobotV5Report("30d");
    expect(r.disinfection.uv).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildHospitalRobotV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
