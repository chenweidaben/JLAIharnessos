/**
 * 健澜科技 jlmedaios - 护理文书统计 V13 单测（M376-B，stats 避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeNursingDocumentTimelyRateV13,
  computeNursingRecordCompletenessRateV13,
  computeNursingWritingPassRateV13,
  type NursingDocumentRecordV13,
} from "../../src/bff/aggregators/nursingDocumentStatsV13Aggregator";
import { nursingDocumentStatsV13Routes } from "../../src/bff/routes/nursingDocumentStatsV13";

const records: NursingDocumentRecordV13[] = [
  { writingCheckCount: 100, writingPassCount: 98, recordCount: 100, recordCompleteCount: 97, shouldWriteCount: 100, timelyWriteCount: 99 },
  { writingCheckCount: 100, writingPassCount: 98, recordCount: 100, recordCompleteCount: 97, shouldWriteCount: 100, timelyWriteCount: 99 },
];

describe("computeNursingWritingPassRateV13", () => {
  // 算式：(98+98)/(100+100) = 196/200×100 = 98.00
  it("护理书写合格率 = 98.00%", () => {
    expect(computeNursingWritingPassRateV13(records)).toBe(98.00);
  });
  it("空态 → 0", () => {
    expect(computeNursingWritingPassRateV13([])).toBe(0);
  });
});

describe("computeNursingRecordCompletenessRateV13", () => {
  // 算式：(97+97)/(100+100) = 194/200×100 = 97.00
  it("护理记录完整率 = 97.00%", () => {
    expect(computeNursingRecordCompletenessRateV13(records)).toBe(97.00);
  });
});

describe("computeNursingDocumentTimelyRateV13", () => {
  // 算式：(99+99)/(100+100) = 198/200×100 = 99.00
  it("护理文书及时率 = 99.00%", () => {
    expect(computeNursingDocumentTimelyRateV13(records)).toBe(99.00);
  });
});

describe("nursingDocumentStatsV13Routes 读路由", () => {
  it("GET /api/v1/nursing-document-stats 路由存在且 auth:true", () => {
    const route = nursingDocumentStatsV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/nursing-document-stats",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
