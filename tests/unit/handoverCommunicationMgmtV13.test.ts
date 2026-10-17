/**
 * 健澜科技 jlmedaios - 交接班沟通管理 V13 单测（M425-B，换名避让旧版 handoverDetailV13（M413））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeHandoverOmissionRateV13,
  computeHandoverRecordCompleteRateV13,
  computeSbarHandoverComplianceRateV13,
  type HandoverCommunicationMgmtRecordV13,
} from "../../src/bff/aggregators/handoverCommunicationMgmtV13Aggregator";
import { handoverCommunicationMgmtV13Routes } from "../../src/bff/routes/handoverCommunicationMgmtV13";

const records: HandoverCommunicationMgmtRecordV13[] = [
  { sbarCompliant: 980, omission: 5, recordComplete: 990, handoverTotal: 1000 },
  { sbarCompliant: 980, omission: 5, recordComplete: 990, handoverTotal: 1000 },
];

describe("computeSbarHandoverComplianceRateV13", () => {
  // 算式：(980+980)/(1000+1000)×100 = 1960/2000×100 = 98.00
  it("SBAR 交接班规范率 = 98.00%", () => {
    expect(computeSbarHandoverComplianceRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeSbarHandoverComplianceRateV13([])).toBe(0);
  });
});

describe("computeHandoverOmissionRateV13", () => {
  // 算式：(5+5)/(1000+1000)×100 = 10/2000×100 = 0.50（反向指标，越低越好）
  it("交接班遗漏率 = 0.50%（反向指标）", () => {
    expect(computeHandoverOmissionRateV13(records)).toBe(0.50);
  });
});

describe("computeHandoverRecordCompleteRateV13", () => {
  // 算式：(990+990)/(1000+1000)×100 = 1980/2000×100 = 99.00
  it("交接班记录完整率 = 99.00%", () => {
    expect(computeHandoverRecordCompleteRateV13(records)).toBe(99.00);
  });
});

describe("handoverCommunicationMgmtV13Routes 读路由", () => {
  it("GET /api/v1/handover-communication-mgmt 路由存在且 auth:true", () => {
    const route = handoverCommunicationMgmtV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/handover-communication-mgmt",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
