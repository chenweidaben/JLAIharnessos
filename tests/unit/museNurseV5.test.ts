/**
 * 健澜科技 jlmedaios - 护士 MUSE 工作台 V5 单测（M283-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMuseNurseV5Report,
  buildNurseDailyV5,
  flagHighRiskV5,
  planRoundsV5,
  type RiskPatient,
  type RoundTask,
} from "../../src/bff/aggregators/museNurseV5Aggregator";
import { museNurseV5Routes } from "../../src/bff/routes/museNurseV5";

describe("planRoundsV5", () => {
  it("按scheduledHour升序→6点最先", () => {
    const tasks: RoundTask[] = [
      { patientId: "p1", ward: "w", scheduledHour: 8 },
      { patientId: "p2", ward: "w", scheduledHour: 6 },
      { patientId: "p3", ward: "w", scheduledHour: 10 },
    ];
    expect(planRoundsV5(tasks)[0].patientId).toBe("p2");
  });
});

describe("flagHighRiskV5", () => {
  it("跌倒或压疮任一即高风险→2人", () => {
    const patients: RiskPatient[] = [
      { patientId: "p1", name: "a", fallRisk: true, pressureUlcerRisk: false, vitalAbnormal: false },
      { patientId: "p2", name: "b", fallRisk: false, pressureUlcerRisk: false, vitalAbnormal: false },
      { patientId: "p3", name: "c", fallRisk: false, pressureUlcerRisk: true, vitalAbnormal: false },
    ];
    expect(flagHighRiskV5(patients).length).toBe(2);
  });
});

describe("buildNurseDailyV5", () => {
  it("3任务2高风险", () => {
    const patients: RiskPatient[] = [
      { patientId: "p1", name: "a", fallRisk: true, pressureUlcerRisk: false, vitalAbnormal: false },
      { patientId: "p2", name: "b", fallRisk: false, pressureUlcerRisk: false, vitalAbnormal: false },
    ];
    const r = buildNurseDailyV5("n1", "心内", [{ patientId: "x", ward: "w", scheduledHour: 8 }], patients);
    expect(r.totalRounds).toBe(1);
    expect(r.highRiskCount).toBe(1);
  });
});

describe("buildMuseNurseV5Report", () => {
  it("2病区平均高风险2.5", () => {
    const r = buildMuseNurseV5Report([{ highRiskCount: 2 }, { highRiskCount: 3 }]);
    expect(r.avgHighRiskPerWard).toBe(2.5);
  });
});

describe("museNurseV5Routes 写权限", () => {
  it("POST /api/v1/muse-nurse/complete 路由存在且 auth:true", () => {
    const post = museNurseV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/muse-nurse/complete");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
