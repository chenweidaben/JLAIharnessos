/**
 * 健澜科技 jlmedaios - 病案归档管理 V13 单测（M420-A，archive 维度避让旧版 medicalRecordMgmtV13/medicalRecordDetailV13）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeMedicalRecordArchiveTimelyRateV13,
  computeMedicalRecordBorrowReturnRateV13,
  computeMedicalRecordStockTurnoverRateV13,
  type MedicalRecordArchiveMgmtRecordV13,
} from "../../src/bff/aggregators/medicalRecordArchiveMgmtV13Aggregator";
import { medicalRecordArchiveMgmtV13Routes } from "../../src/bff/routes/medicalRecordArchiveMgmtV13";

const records: MedicalRecordArchiveMgmtRecordV13[] = [
  { archiveTimely: 980, archiveShould: 1000, stockBorrowReturn: 950, stockTotal: 1000, borrowReturnOnTime: 990, borrowTotal: 1000 },
  { archiveTimely: 980, archiveShould: 1000, stockBorrowReturn: 950, stockTotal: 1000, borrowReturnOnTime: 990, borrowTotal: 1000 },
];

describe("computeMedicalRecordArchiveTimelyRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("病案归档及时率 = 98.00%", () => {
    expect(computeMedicalRecordArchiveTimelyRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeMedicalRecordArchiveTimelyRateV13([])).toBe(0);
  });
});

describe("computeMedicalRecordStockTurnoverRateV13", () => {
  // 算式：(950+950)/(1000+1000)×100 = 1900/2000×100 = 95.00
  it("病案室库存周转率 = 95.00%", () => {
    expect(computeMedicalRecordStockTurnoverRateV13(records)).toBe(95.00);
  });
});

describe("computeMedicalRecordBorrowReturnRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("病案借阅归还率 = 99.00%", () => {
    expect(computeMedicalRecordBorrowReturnRateV13(records)).toBe(99.00);
  });
});

describe("medicalRecordArchiveMgmtV13Routes 读路由", () => {
  it("GET /api/v1/medical-record-archive-mgmt 路由存在且 auth:true", () => {
    const route = medicalRecordArchiveMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-record-archive-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
