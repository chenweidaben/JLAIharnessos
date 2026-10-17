/**
 * 健澜科技 jlmedaios - 区域健康数据汇总 V13 单测（M324-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  compareExamVolumeV13,
  compareInpatientVolumeV13,
  compareOutpatientVolumeV13,
  type RegionalHospitalV13,
} from "../../src/bff/aggregators/regionalHealthDataV13Aggregator";
import { regionalHealthDataV13Routes } from "../../src/bff/routes/regionalHealthDataV13";

const hospitals: RegionalHospitalV13[] = [
  { hospitalId: "h1", hospitalName: "浙大一院", outpatientVolume: 10000, inpatientVolume: 5000, examVolume: 8000 },
  { hospitalId: "h2", hospitalName: "浙大二院", outpatientVolume: 8000, inpatientVolume: 4000, examVolume: 6000 },
  { hospitalId: "h3", hospitalName: "省人民医院", outpatientVolume: 6000, inpatientVolume: 3000, examVolume: 4000 },
  { hospitalId: "h4", hospitalName: "市一医院", outpatientVolume: 4000, inpatientVolume: 2000, examVolume: 2000 },
  { hospitalId: "h5", hospitalName: "区中心医院", outpatientVolume: 2000, inpatientVolume: 1000, examVolume: 1000 },
];

describe("compareOutpatientVolumeV13", () => {
  // 算式：排序后最高 = 10000（浙大一院）
  it("最高门诊量 = 10000", () => {
    const result = compareOutpatientVolumeV13(hospitals);
    expect(result[0].volume).toBe(10000);
    expect(result[0].hospitalName).toBe("浙大一院");
  });
  it("空态 → []", () => {
    expect(compareOutpatientVolumeV13([]).length).toBe(0);
  });
});

describe("compareInpatientVolumeV13", () => {
  // 算式：排序后最高 = 5000（浙大一院）
  it("最高住院量 = 5000", () => {
    const result = compareInpatientVolumeV13(hospitals);
    expect(result[0].volume).toBe(5000);
  });
});

describe("compareExamVolumeV13", () => {
  // 算式：排序后最高 = 8000（浙大一院）
  it("最高检查量 = 8000", () => {
    const result = compareExamVolumeV13(hospitals);
    expect(result[0].volume).toBe(8000);
  });
});

describe("regionalHealthDataV13Routes 读路由", () => {
  it("GET /api/v1/regional-health-data 路由存在且 auth:true", () => {
    const route = regionalHealthDataV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/regional-health-data",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
