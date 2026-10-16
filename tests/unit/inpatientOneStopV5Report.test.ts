/**
 * 健澜科技 jlmedaios - 住院一站式服务 V5 纯函数单测（M270-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildInpatientOneStopV5Report,
  prepareAdmissionV5,
  settleDischargeV5,
} from "../../src/bff/aggregators/inpatientOneStopV5ReportAggregator";

describe("prepareAdmissionV5", () => {
  it("资料齐全+有床 → 可入院等待0天", () => {
    expect(prepareAdmissionV5({ insurance: true, docsReady: true }, { bedsAvailable: 5 }).ready).toBe(true);
  });
});

describe("settleDischargeV5", () => {
  it("总费用10000+押金15000+医保覆盖80% → 退13000", () => {
    expect(settleDischargeV5({ total: 10000, deposit: 15000 }, { covered: true, ratio: 0.8 }).refund).toBe(13000);
  });
});

describe("buildInpatientOneStopV5Report", () => {
  it("生成入院准备数据", () => {
    const r = buildInpatientOneStopV5Report("30d");
    expect(r.admissionPre.preAssessment).toBeGreaterThan(0);
  });

  it("生成出院结算数据", () => {
    const r = buildInpatientOneStopV5Report("30d");
    expect(r.dischargeSettlement.insurance).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildInpatientOneStopV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
