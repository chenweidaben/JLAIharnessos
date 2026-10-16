/**
 * 健澜科技 jlmedaios - 互联网医院 V3 纯函数单测（M234-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildInternetHospitalV3Report,
  processOnlinePrescription,
  routeOnlineConsultation,
} from "../../src/bff/aggregators/internetHospitalV3ReportAggregator";

describe("routeOnlineConsultation", () => {
  it("视频请求 → 视频问诊", () => {
    expect(routeOnlineConsultation("视频问诊").type).toBe("视频问诊");
  });

  it("图文请求 → 图文问诊", () => {
    expect(routeOnlineConsultation("图文咨询").type).toBe("图文问诊");
  });
});

describe("processOnlinePrescription", () => {
  it("有效处方 → 通过", () => {
    expect(processOnlinePrescription("Rx001").valid).toBe(true);
  });
});

describe("buildInternetHospitalV3Report", () => {
  it("生成问诊数据", () => {
    const r = buildInternetHospitalV3Report("30d");
    expect(r.consult.text).toBeGreaterThan(0);
  });

  it("生成处方数据", () => {
    const r = buildInternetHospitalV3Report("30d");
    expect(r.prescription.online).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildInternetHospitalV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
