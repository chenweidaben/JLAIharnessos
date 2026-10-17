/**
 * 健澜科技 jlmedaios - 疾控传染病与慢病直报 V5 单测（M278-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildCDCANotificationV5Report,
  buildCDCRecordV5,
  detectNotifiableV5,
  trackChronicDiseaseV5,
  type CDCRecord,
} from "../../src/bff/aggregators/cdcNotificationV5Aggregator";

describe("detectNotifiableV5", () => {
  it("鼠疫→甲类", () => {
    expect(detectNotifiableV5("鼠疫")).toBe("甲类");
  });
  it("肺结核→乙类", () => {
    expect(detectNotifiableV5("肺结核")).toBe("乙类");
  });
  it("流行性感冒→丙类", () => {
    expect(detectNotifiableV5("流行性感冒")).toBe("丙类");
  });
  it("普通感冒→非法定", () => {
    expect(detectNotifiableV5("普通感冒")).toBe("非法定");
  });
});

describe("buildCDCRecordV5", () => {
  it("甲类传染病→需随访", () => {
    const r = buildCDCRecordV5({ caseRef: "c1", diagnosis: "鼠疫", patientAge: 40, reportDate: "2026-10-17" });
    expect(r.followupRequired).toBe(true);
    expect(r.category).toBe("甲类");
  });
});

describe("trackChronicDiseaseV5", () => {
  it("糖尿病35天未随访→到期", () => {
    expect(trackChronicDiseaseV5("糖尿病", 35).due).toBe(true);
  });
  it("高血压60天未随访→未到期", () => {
    expect(trackChronicDiseaseV5("高血压", 60).due).toBe(false);
  });
});

describe("buildCDCANotificationV5Report", () => {
  it("按类别统计并算待随访", () => {
    const records: CDCRecord[] = [
      buildCDCRecordV5({ caseRef: "c1", diagnosis: "鼠疫", patientAge: 40, reportDate: "d" }),
      buildCDCRecordV5({ caseRef: "c2", diagnosis: "流行性感冒", patientAge: 30, reportDate: "d" }),
    ];
    const r = buildCDCANotificationV5Report(records);
    expect(r.categoryCounts.甲类).toBe(1);
    expect(r.categoryCounts.丙类).toBe(1);
    expect(r.pendingFollowup).toBe(1);
  });
});
