/**
 * 健澜科技 jlmedaios - 教学活动 V13 单测（M383-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeCaseDiscussionCountV13,
  computeMiniLectureCountV13,
  computeTeachingRoundCountV13,
  type TeachingActivityRecordV13,
} from "../../src/bff/aggregators/teachingActivityV13Aggregator";
import { teachingActivityV13Routes } from "../../src/bff/routes/teachingActivityV13";

const records: TeachingActivityRecordV13[] = [
  { teachingRoundCount: 50, miniLectureCount: 80, caseDiscussionCount: 60 },
  { teachingRoundCount: 50, miniLectureCount: 80, caseDiscussionCount: 60 },
];

describe("computeTeachingRoundCountV13", () => {
  // 算式：50+50 = 100
  it("教学查房次数 = 100 次", () => {
    expect(computeTeachingRoundCountV13(records)).toBe(100);
  });
  it("空态 → 0", () => {
    expect(computeTeachingRoundCountV13([])).toBe(0);
  });
});

describe("computeMiniLectureCountV13", () => {
  // 算式：80+80 = 160
  it("小讲课次数 = 160 次", () => {
    expect(computeMiniLectureCountV13(records)).toBe(160);
  });
});

describe("computeCaseDiscussionCountV13", () => {
  // 算式：60+60 = 120
  it("病例讨论次数 = 120 次", () => {
    expect(computeCaseDiscussionCountV13(records)).toBe(120);
  });
});

describe("teachingActivityV13Routes 读路由", () => {
  it("GET /api/v1/teaching-activity 路由存在且 auth:true", () => {
    const route = teachingActivityV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/teaching-activity",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
