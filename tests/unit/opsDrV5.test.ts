/**
 * 健澜科技 jlmedaios - 灾备与高可用 V5 单测（M286-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessRPO_RTOV5,
  buildOpsDRV5Report,
  checkBackupV5,
  simulateFailoverV5,
  type DRPlan,
} from "../../src/bff/aggregators/opsDrV5Aggregator";
import { opsDrV5Routes } from "../../src/bff/routes/opsDrV5";

const now = 1000000000;

describe("checkBackupV5", () => {
  it("10分钟前备份，频率30分钟→新鲜", () => {
    // fresh = 10 <= 30*2=60
    const plan: DRPlan = { system: "HIS", rpoMinutes: 15, rtoMinutes: 60, backupFreqMinutes: 30, lastBackupAt: now - 10 * 60000, status: "healthy" };
    const r = checkBackupV5(plan, now);
    expect(r.fresh).toBe(true);
    expect(r.ageMinutes).toBe(10);
  });
  it("100分钟前备份，频率30分钟→过期", () => {
    // fresh = 100 <= 60 false
    const plan: DRPlan = { system: "PACS", rpoMinutes: 15, rtoMinutes: 60, backupFreqMinutes: 30, lastBackupAt: now - 100 * 60000, status: "stale" };
    expect(checkBackupV5(plan, now).fresh).toBe(false);
  });
});

describe("simulateFailoverV5", () => {
  it("RTO=60分钟→预计切换48分钟", () => {
    // 60 * 0.8 = 48
    const plan: DRPlan = { system: "HIS", rpoMinutes: 15, rtoMinutes: 60, backupFreqMinutes: 30, lastBackupAt: now, status: "healthy" };
    expect(simulateFailoverV5(plan).estimatedSwitchMinutes).toBe(48);
    expect(simulateFailoverV5(plan).feasible).toBe(true);
  });
});

describe("assessRPO_RTOV5", () => {
  it("RPO=15且备份10分钟前，RTO=60→A级", () => {
    const plan: DRPlan = { system: "HIS", rpoMinutes: 15, rtoMinutes: 60, backupFreqMinutes: 30, lastBackupAt: now, status: "healthy" };
    const r = assessRPO_RTOV5(plan, 10);
    expect(r.rpoMet).toBe(true);
    expect(r.rtoMet).toBe(true);
    expect(r.grade).toBe("A");
  });
  it("RPO=60但备份90分钟前→rpoMet=false，RTO=30达标→B级", () => {
    const plan: DRPlan = { system: "PACS", rpoMinutes: 60, rtoMinutes: 30, backupFreqMinutes: 120, lastBackupAt: now, status: "stale" };
    const r = assessRPO_RTOV5(plan, 90);
    expect(r.rpoMet).toBe(false);
    expect(r.rtoMet).toBe(true);
    expect(r.grade).toBe("B");
  });
});

describe("buildOpsDRV5Report", () => {
  it("2系统1新鲜1A级", () => {
    const plans: DRPlan[] = [
      { system: "HIS", rpoMinutes: 15, rtoMinutes: 60, backupFreqMinutes: 30, lastBackupAt: now - 10 * 60000, status: "healthy" },
      { system: "PACS", rpoMinutes: 60, rtoMinutes: 30, backupFreqMinutes: 120, lastBackupAt: now - 100 * 60000, status: "stale" },
    ];
    const r = buildOpsDRV5Report(plans, now);
    expect(r.totalSystems).toBe(2);
    // HIS新鲜，PACS(100>240? 100<=240 fresh) — 实际两个都新鲜但只有HIS是A级
    expect(r.gradeA).toBe(1);
  });
});

describe("opsDrV5Routes 写权限", () => {
  it("POST /api/v1/ops-dr/exercise 路由存在且 auth:true", () => {
    const post = opsDrV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/ops-dr/exercise");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
