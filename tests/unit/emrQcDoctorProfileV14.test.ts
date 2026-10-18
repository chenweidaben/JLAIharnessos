/**
 * 健澜科技 jlmedaios - 医生质控个人档案 V14 单测（M542-C）
 *
 * 测试 buildQcDoctorProfile 构建医生档案、loadQcDoctorProfile 医生档案加载、buildQcDoctorProfileReport 构建档案报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildQcDoctorProfile,
  buildQcDoctorProfileReport,
  loadQcDoctorProfile,
  type QcDoctorProfileInputV14,
} from "../../src/bff/aggregators/emrQcDoctorProfileV14Aggregator";
import { emrQcDoctorProfileV14Routes } from "../../src/bff/routes/emrQcDoctorProfileV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildQcDoctorProfile 构建医生档案", () => {
  // 手算：doctorId='D001', doctorName='张医生' → 正确构建
  it("doctorId='D001', doctorName='张医生' → 正确构建", () => {
    const base = buildQcDoctorProfile("D001", "张医生");
    expect(base.doctorId).toBe("D001");
    expect(base.doctorName).toBe("张医生");
  });
});

describe("loadQcDoctorProfile 优秀", () => {
  // 手算：{doctorId='D001', totalRecords=200, defectCount=8, avgScore=95}
  // 手算：defectRate = Math.round(8/200*1000)/10 = Math.round(0.04*1000)/10 = Math.round(40)/10 = 40/10 = 4.0
  // 手算：level = defectRate<=5 ? '优秀' : ... → 4.0<=5 → '优秀'
  it("{doctorId='D001', totalRecords=200, defectCount=8} → defectRate=4.0, level='优秀'", () => {
    const input: QcDoctorProfileInputV14 = { doctorId: "D001", totalRecords: 200, defectCount: 8, avgScore: 95 };
    const result = loadQcDoctorProfile(input);
    expect(result.doctorId).toBe("D001");
    expect(result.defectRate).toBeCloseTo(4.0);
    expect(result.level).toBe("优秀");
  });
});

describe("loadQcDoctorProfile 需改进", () => {
  // 手算：{doctorId='D002', totalRecords=100, defectCount=20, avgScore=70}
  // 手算：defectRate = Math.round(20/100*1000)/10 = Math.round(0.2*1000)/10 = Math.round(200)/10 = 200/10 = 20.0
  // 手算：level = defectRate<=5 ? '优秀' : defectRate<=15 ? '合格' : '需改进' → 20.0>15 → '需改进'
  it("{doctorId='D002', totalRecords=100, defectCount=20} → defectRate=20.0, level='需改进'", () => {
    const input: QcDoctorProfileInputV14 = { doctorId: "D002", totalRecords: 100, defectCount: 20, avgScore: 70 };
    const result = loadQcDoctorProfile(input);
    expect(result.doctorId).toBe("D002");
    expect(result.defectRate).toBeCloseTo(20.0);
    expect(result.level).toBe("需改进");
  });
});

describe("buildQcDoctorProfileReport 构建档案报告", () => {
  // 手算：{doctorId='D001', defectRate=4.0, level='优秀'}
  // 手算：透传 doctorId + defectRate + level
  it("{doctorId='D001', defectRate=4.0, level='优秀'} → 正确返回（透传）", () => {
    const report = buildQcDoctorProfileReport({ doctorId: "D001", defectRate: 4.0, level: "优秀" });
    expect(report.doctorId).toBe("D001");
    expect(report.defectRate).toBeCloseTo(4.0);
    expect(report.level).toBe("优秀");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-doctor-profile auth:true", () => {
    const def = (emrQcDoctorProfileV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-doctor-profile");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
