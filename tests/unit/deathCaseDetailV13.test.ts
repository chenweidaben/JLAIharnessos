/**
 * 健澜科技 jlmedaios - 死亡病例管理（细节）V13 单测（M427-D，M427 收官，detail 避让旧版 deathCaseMgmtV13（M412））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeDeathCaseDiscussionRateV13,
  computeDeathCaseDiscussionTimelyRateV13,
  computeDeathCaseRecordCompleteRateV13,
  type DeathCaseDetailRecordV13,
} from "../../src/bff/aggregators/deathCaseDetailV13Aggregator";
import { deathCaseDetailV13Routes } from "../../src/bff/routes/deathCaseDetailV13";

const records: DeathCaseDetailRecordV13[] = [
  { discussed: 95, deathTotal: 100, discussionTimely: 90, shouldDiscuss: 100, recordComplete: 98 },
  { discussed: 95, deathTotal: 100, discussionTimely: 90, shouldDiscuss: 100, recordComplete: 98 },
];

describe("computeDeathCaseDiscussionRateV13", () => {
  // 算式：(95+95)/(100+100)×100 = 190/200×100 = 95.00
  it("死亡病例讨论率 = 95.00%", () => {
    expect(computeDeathCaseDiscussionRateV13(records)).toBe(95.00);
  });
  it("空态 → 0", () => {
    expect(computeDeathCaseDiscussionRateV13([])).toBe(0);
  });
});

describe("computeDeathCaseDiscussionTimelyRateV13", () => {
  // 算式：(90+90)/(100+100)×100 = 180/200×100 = 90.00
  it("死亡病例讨论及时率 = 90.00%", () => {
    expect(computeDeathCaseDiscussionTimelyRateV13(records)).toBe(90.00);
  });
});

describe("computeDeathCaseRecordCompleteRateV13", () => {
  // 算式：(98+98)/(100+100)×100 = 196/200×100 = 98.00
  it("死亡病例记录完整率 = 98.00%", () => {
    expect(computeDeathCaseRecordCompleteRateV13(records)).toBe(98.00);
  });
});

describe("deathCaseDetailV13Routes 读路由", () => {
  it("GET /api/v1/death-case-detail 路由存在且 auth:true", () => {
    const route = deathCaseDetailV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/death-case-detail",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
