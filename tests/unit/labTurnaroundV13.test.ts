/**
 * 健澜科技 jlmedaios - 检验报告周转时间 V13 单测（M338-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeEmergencyTATV13,
  computeInpatientTATV13,
  computeOutpatientTATV13,
  type LabTurnaroundRecordV13,
} from "../../src/bff/aggregators/labTurnaroundV13Aggregator";
import { labTurnaroundV13Routes } from "../../src/bff/routes/labTurnaroundV13";

const records: LabTurnaroundRecordV13[] = [
  { outpatientTATHours: 2, emergencyTATHours: 1, inpatientTATHours: 6 },
  { outpatientTATHours: 4, emergencyTATHours: 2, inpatientTATHours: 8 },
  { outpatientTATHours: 6, emergencyTATHours: 3, inpatientTATHours: 10 },
];

describe("computeOutpatientTATV13", () => {
  // 算式：(2+4+6)/3 = 12/3 = 4.0
  it("门诊常规 TAT = 4.0 小时", () => {
    expect(computeOutpatientTATV13(records)).toBe(4.0);
  });
  it("空态 → 0", () => {
    expect(computeOutpatientTATV13([])).toBe(0);
  });
});

describe("computeEmergencyTATV13", () => {
  // 算式：(1+2+3)/3 = 6/3 = 2.0
  it("急诊 TAT = 2.0 小时", () => {
    expect(computeEmergencyTATV13(records)).toBe(2.0);
  });
});

describe("computeInpatientTATV13", () => {
  // 算式：(6+8+10)/3 = 24/3 = 8.0
  it("住院 TAT = 8.0 小时", () => {
    expect(computeInpatientTATV13(records)).toBe(8.0);
  });
});

describe("labTurnaroundV13Routes 读路由", () => {
  it("GET /api/v1/lab-turnaround 路由存在且 auth:true", () => {
    const route = labTurnaroundV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/lab-turnaround",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
