/**
 * 健澜科技 jlmedaios - 人才团队管理 V13 单测（M403-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeAcademicianAndMasterCountV13,
  computeDoctoralMasterSupervisorCountV13,
  computeHighLevelTalentIntroducedCountV13,
  type TalentTeamMgmtRecordV13,
} from "../../src/bff/aggregators/talentTeamMgmtV13Aggregator";
import { talentTeamMgmtV13Routes } from "../../src/bff/routes/talentTeamMgmtV13";

const records: TalentTeamMgmtRecordV13[] = [
  { academicianCount: 1, supervisorCount: 10, highLevelCount: 5 },
  { academicianCount: 1, supervisorCount: 10, highLevelCount: 5 },
];

describe("computeAcademicianAndMasterCountV13", () => {
  // 算式：1+1 = 2
  it("院士及国医大师数 = 2 人", () => {
    expect(computeAcademicianAndMasterCountV13(records)).toBe(2);
  });
  it("空态 → 0", () => {
    expect(computeAcademicianAndMasterCountV13([])).toBe(0);
  });
});

describe("computeDoctoralMasterSupervisorCountV13", () => {
  // 算式：10+10 = 20
  it("博导硕导数 = 20 人", () => {
    expect(computeDoctoralMasterSupervisorCountV13(records)).toBe(20);
  });
});

describe("computeHighLevelTalentIntroducedCountV13", () => {
  // 算式：5+5 = 10
  it("高层次人才引进数 = 10 人", () => {
    expect(computeHighLevelTalentIntroducedCountV13(records)).toBe(10);
  });
});

describe("talentTeamMgmtV13Routes 读路由", () => {
  it("GET /api/v1/talent-team-mgmt 路由存在且 auth:true", () => {
    const route = talentTeamMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/talent-team-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
