/**
 * 健澜科技 jlmedaios - 转科转院管理 V13 单测（M411-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeTransferAssessmentCompletionRateV13,
  computeTransferHandoverPassRateV13,
  computeTransferRecordCompletenessRateV13,
  type InpatientTransferMgmtRecordV13,
} from "../../src/bff/aggregators/inpatientTransferMgmtV13Aggregator";
import { inpatientTransferMgmtV13Routes } from "../../src/bff/routes/inpatientTransferMgmtV13";

const records: InpatientTransferMgmtRecordV13[] = [
  { complete: 95, recordTotal: 100, assessed: 90, transferTotal: 100, qualified: 98, handoverTotal: 100 },
  { complete: 95, recordTotal: 100, assessed: 90, transferTotal: 100, qualified: 98, handoverTotal: 100 },
];

describe("computeTransferRecordCompletenessRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00
  it("转科记录完整率 = 95.00%", () => {
    expect(computeTransferRecordCompletenessRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeTransferRecordCompletenessRateV13([])).toBe(0);
  });
});

describe("computeTransferAssessmentCompletionRateV13", () => {
  // 算式：(90+90)/(100+100)×100 = 180/200×100 = 90.00
  it("转院评估完成率 = 90.00%", () => {
    expect(computeTransferAssessmentCompletionRateV13(records)).toBe(90.00);
  });
});

describe("computeTransferHandoverPassRateV13", () => {
  // 算式：(98+98)/(100+100)×100 = 196/200×100 = 98.00
  it("转科交接合格率 = 98.00%", () => {
    expect(computeTransferHandoverPassRateV13(records)).toBe(98.00);
  });
});

describe("inpatientTransferMgmtV13Routes 读路由", () => {
  it("GET /api/v1/inpatient-transfer-mgmt 路由存在且 auth:true", () => {
    const route = inpatientTransferMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/inpatient-transfer-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
