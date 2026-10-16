/**
 * 健澜科技 jlmedaios - 互联网医院与处方流转 V5 纯函数单测（M262-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildInternetHospitalV5Report,
  eligibleForOnlineV5,
  routePrescriptionV5,
} from "../../src/bff/aggregators/internetHospitalV5ReportAggregator";

describe("eligibleForOnlineV5", () => {
  it("有高血压病史+非急性 → 符合图文复诊", () => {
    expect(eligibleForOnlineV5({ age: 50, history: ["高血压"] }, { diagnosis: "高血压", acute: false }).eligible).toBe(true);
  });
});

describe("routePrescriptionV5", () => {
  it("紧急处方+近药店有货 → 送药上门2小时", () => {
    expect(routePrescriptionV5({ drug: "降压药", urgent: true }, [{ name: "近药房", stock: 10, distance: 1 }]).delivery).toBe("送药上门2小时");
  });
});

describe("buildInternetHospitalV5Report", () => {
  it("生成在线复诊数据", () => {
    const r = buildInternetHospitalV5Report("30d");
    expect(r.onlineVisit.realname).toBeGreaterThan(0);
  });

  it("生成处方流转数据", () => {
    const r = buildInternetHospitalV5Report("30d");
    expect(r.prescriptionFlow.transfer).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildInternetHospitalV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
