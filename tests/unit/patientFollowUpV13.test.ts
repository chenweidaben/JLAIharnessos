/**
 * 健澜科技 jlmedaios - 随访完成率 V13 单测（M326-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  compute7DayFollowUpRateV13,
  compute30DayFollowUpRateV13,
  listIncompleteFollowUpsV13,
  type FollowUpRecordV13,
} from "../../src/bff/aggregators/patientFollowUpV13Aggregator";
import { patientFollowUpV13Routes } from "../../src/bff/routes/patientFollowUpV13";

const followUps: FollowUpRecordV13[] = [
  { patientName: "张三", completed7Day: true, completed30Day: true },
  { patientName: "李四", completed7Day: true, completed30Day: true },
  { patientName: "王五", completed7Day: true, completed30Day: true },
  { patientName: "赵六", completed7Day: true, completed30Day: true },
  { patientName: "钱七", completed7Day: true, completed30Day: true },
  { patientName: "孙八", completed7Day: true, completed30Day: true },
  { patientName: "周九", completed7Day: true, completed30Day: true },
  { patientName: "吴十", completed7Day: true, completed30Day: true },
  { patientName: "郑十一", completed7Day: false, completed30Day: true },
  { patientName: "王十二", completed7Day: false, completed30Day: false },
];

describe("compute7DayFollowUpRateV13", () => {
  // 算式：8/10×100 = 80
  it("7 天率 = 80%", () => {
    expect(compute7DayFollowUpRateV13(followUps)).toBe(80);
  });
  it("空态 → 0", () => {
    expect(compute7DayFollowUpRateV13([])).toBe(0);
  });
});

describe("compute30DayFollowUpRateV13", () => {
  // 算式：9/10×100 = 90
  it("30 天率 = 90%", () => {
    expect(compute30DayFollowUpRateV13(followUps)).toBe(90);
  });
});

describe("listIncompleteFollowUpsV13", () => {
  // 算式：郑十一 / 王十二
  it("未完成 = 2 人", () => {
    expect(listIncompleteFollowUpsV13(followUps).length).toBe(2);
  });
});

describe("patientFollowUpV13Routes 读路由", () => {
  it("GET /api/v1/patient-follow-up 路由存在且 auth:true", () => {
    const route = patientFollowUpV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/patient-follow-up",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
