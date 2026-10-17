/**
 * 健澜科技 jlmedaios - 就医体验（等候时间）V13 单测（M365-D，M365 收官）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeConsultationWaitTimeV13,
  computeExaminationWaitTimeV13,
  computeRegistrationWaitTimeV13,
  type ExperienceWaitTimeRecordV13,
} from "../../src/bff/aggregators/experienceWaitTimeV13Aggregator";
import { experienceWaitTimeV13Routes } from "../../src/bff/routes/experienceWaitTimeV13";

const records: ExperienceWaitTimeRecordV13[] = [
  { registrationWaitTime: 10, consultationWaitTime: 15, examinationWaitTime: 30 },
  { registrationWaitTime: 20, consultationWaitTime: 25, examinationWaitTime: 40 },
];

describe("computeRegistrationWaitTimeV13", () => {
  // 算式：(10+20)/2 = 15.00
  it("挂号等候时间 = 15.00 分钟", () => {
    expect(computeRegistrationWaitTimeV13(records)).toBe(15.00);
  });
  it("空态 → 0", () => {
    expect(computeRegistrationWaitTimeV13([])).toBe(0);
  });
});

describe("computeConsultationWaitTimeV13", () => {
  // 算式：(15+25)/2 = 20.00
  it("就诊等候时间 = 20.00 分钟", () => {
    expect(computeConsultationWaitTimeV13(records)).toBe(20.00);
  });
});

describe("computeExaminationWaitTimeV13", () => {
  // 算式：(30+40)/2 = 35.00
  it("检查等候时间 = 35.00 分钟", () => {
    expect(computeExaminationWaitTimeV13(records)).toBe(35.00);
  });
});

describe("experienceWaitTimeV13Routes 读路由", () => {
  it("GET /api/v1/experience-wait-time 路由存在且 auth:true", () => {
    const route = experienceWaitTimeV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/experience-wait-time",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
