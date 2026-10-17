/**
 * 健澜科技 jlmedaios - 医联体与分级诊疗 V13 单测（M355-D，M355 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDownwardReferralCountV13,
  computeRemoteConsultationCountV13,
  computeUpwardReferralCountV13,
  type MedicalAllianceRecordV13,
} from "../../src/bff/aggregators/medicalAllianceV13Aggregator";
import { medicalAllianceV13Routes } from "../../src/bff/routes/medicalAllianceV13";

const records: MedicalAllianceRecordV13[] = [
  { downwardReferralCount: 100, upwardReferralCount: 150, remoteConsultationCount: 30 },
  { downwardReferralCount: 200, upwardReferralCount: 250, remoteConsultationCount: 70 },
];

describe("computeDownwardReferralCountV13", () => {
  // 算式：100+200 = 300
  it("上级下转人次 = 300", () => {
    expect(computeDownwardReferralCountV13(records)).toBe(300);
  });
  it("空态 → 0", () => {
    expect(computeDownwardReferralCountV13([])).toBe(0);
  });
});

describe("computeUpwardReferralCountV13", () => {
  // 算式：150+250 = 400
  it("下级上转人次 = 400", () => {
    expect(computeUpwardReferralCountV13(records)).toBe(400);
  });
});

describe("computeRemoteConsultationCountV13", () => {
  // 算式：30+70 = 100
  it("远程会诊次数 = 100", () => {
    expect(computeRemoteConsultationCountV13(records)).toBe(100);
  });
});

describe("medicalAllianceV13Routes 读路由", () => {
  it("GET /api/v1/medical-alliance 路由存在且 auth:true", () => {
    const route = medicalAllianceV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-alliance",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
