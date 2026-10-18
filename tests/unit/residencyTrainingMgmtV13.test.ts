/**
 * 健澜科技 jlmedaios - 住院医师规范化培训 V13 单测（M443-A，教学科研与继续教育管理组）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeResidencyTrainingCoverageRateV13,
  computeResidencyTrainingFacultyQualifiedRateV13,
  computeResidencyTrainingGraduationPassRateV13,
  type ResidencyTrainingMgmtRecordV13,
} from "../../src/bff/aggregators/residencyTrainingMgmtV13Aggregator";
import { residencyTrainingMgmtV13Routes } from "../../src/bff/routes/residencyTrainingMgmtV13";

const records: ResidencyTrainingMgmtRecordV13[] = [
  { residencyTrained: 950, shouldTrained: 1000, graduationPassed: 900, graduationExam: 1000, facultyQualified: 980, totalFaculty: 1000 },
  { residencyTrained: 950, shouldTrained: 1000, graduationPassed: 900, graduationExam: 1000, facultyQualified: 980, totalFaculty: 1000 },
];

describe("computeResidencyTrainingCoverageRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("住培覆盖率 = 95.00%", () => {
    expect(computeResidencyTrainingCoverageRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeResidencyTrainingCoverageRateV13([])).toBe(0);
  });
});

describe("computeResidencyTrainingGraduationPassRateV13", () => {
  // 算式：(900+900)/(1000+1000)×100 = 1800/2000×100 = 90.00
  it("结业考核通过率 = 90.00%", () => {
    expect(computeResidencyTrainingGraduationPassRateV13(records)).toBe(90.00);
  });
});

describe("computeResidencyTrainingFacultyQualifiedRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("师资带教合格率 = 98.00%", () => {
    expect(computeResidencyTrainingFacultyQualifiedRateV13(records)).toBe(98.00);
  });
});

describe("residencyTrainingMgmtV13Routes 读路由", () => {
  it("GET /api/v1/residency-training-mgmt 路由存在且 auth:true", () => {
    const route = residencyTrainingMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/residency-training-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
