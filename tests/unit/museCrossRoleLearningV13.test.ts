/**
 * 健澜科技 jlmedaios - 跨角色经验互鉴 V13 单测（M321-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCrossRoleClosureRateV13,
  countDoctorToNurseReferencesV13,
  countNurseToDoctorReferencesV13,
  type CrossRoleRecordV13,
} from "../../src/bff/aggregators/museCrossRoleLearningV13Aggregator";
import { museCrossRoleLearningV13Routes } from "../../src/bff/routes/museCrossRoleLearningV13";

const records: CrossRoleRecordV13[] = [
  { recordId: "r1", fromRole: "doctor", toRole: "nurse", isBidirectional: true },
  { recordId: "r2", fromRole: "doctor", toRole: "nurse", isBidirectional: true },
  { recordId: "r3", fromRole: "doctor", toRole: "nurse", isBidirectional: true },
  { recordId: "r4", fromRole: "doctor", toRole: "nurse", isBidirectional: true },
  { recordId: "r5", fromRole: "nurse", toRole: "doctor", isBidirectional: true },
  { recordId: "r6", fromRole: "nurse", toRole: "doctor", isBidirectional: true },
  { recordId: "r7", fromRole: "nurse", toRole: "doctor", isBidirectional: false },
  { recordId: "r8", fromRole: "doctor", toRole: "nurse", isBidirectional: false },
  { recordId: "r9", fromRole: "nurse", toRole: "doctor", isBidirectional: false },
  { recordId: "r10", fromRole: "doctor", toRole: "nurse", isBidirectional: false },
];

describe("countDoctorToNurseReferencesV13", () => {
  // 算式：doctor→nurse = r1+r2+r3+r4+r8+r10 = 6
  it("doctorToNurse = 6", () => {
    expect(countDoctorToNurseReferencesV13(records)).toBe(6);
  });
  it("空态 → 0", () => {
    expect(countDoctorToNurseReferencesV13([])).toBe(0);
  });
});

describe("countNurseToDoctorReferencesV13", () => {
  // 算式：nurse→doctor = r5+r6+r7+r9 = 4
  it("nurseToDoctor = 4", () => {
    expect(countNurseToDoctorReferencesV13(records)).toBe(4);
  });
});

describe("computeCrossRoleClosureRateV13", () => {
  // 算式：isBidirectional=true = r1+r2+r3+r4+r5+r6 = 6
  // closure = 6/10×100 = 60
  it("closureRate = 60", () => {
    expect(computeCrossRoleClosureRateV13(records)).toBe(60);
  });
});

describe("museCrossRoleLearningV13Routes 读路由", () => {
  it("GET /api/v1/muse-cross-role-learning 路由存在且 auth:true", () => {
    const route = museCrossRoleLearningV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/muse-cross-role-learning",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
