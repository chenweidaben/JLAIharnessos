/**
 * 健澜科技 jlmedaios - 经验时间衰减与新鲜度 V13 单测（M296-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  ARCHIVE_MONTHS,
  buildExperienceFreshnessV13,
  EXPIRE_MONTHS,
  freshnessScoreV13,
  type ExperienceFreshV13,
} from "../../src/bff/aggregators/experienceFreshnessV13Aggregator";
import { experienceFreshnessV13Routes } from "../../src/bff/routes/experienceFreshnessV13";

const experiences: ExperienceFreshV13[] = [
  { experienceId: "e-1", title: "房颤", monthsAgo: 6 },
  { experienceId: "e-2", title: "术后", monthsAgo: 18 },
  { experienceId: "e-3", title: "相互作用", monthsAgo: 30 },
  { experienceId: "e-4", title: "VTE", monthsAgo: 40 },
];

describe("freshnessScoreV13", () => {
  it("6月=100 / 18月=75 / 30月=25 / 40月=0", () => {
    expect(freshnessScoreV13(6)).toBe(100);
    expect(freshnessScoreV13(18)).toBe(75);
    expect(freshnessScoreV13(30)).toBe(25);
    expect(freshnessScoreV13(40)).toBe(0);
  });
});

describe("buildExperienceFreshnessV13", () => {
  it("4条分桶：fresh/aging/stale/archive", () => {
    const rows = buildExperienceFreshnessV13(experiences);
    expect(rows[0].bucket).toBe("fresh");
    expect(rows[1].bucket).toBe("aging");
    expect(rows[2].bucket).toBe("stale");
    expect(rows[3].bucket).toBe("archive");
  });
  it("常量：EXPIRE_MONTHS=24 ARCHIVE_MONTHS=36", () => {
    expect(EXPIRE_MONTHS).toBe(24);
    expect(ARCHIVE_MONTHS).toBe(36);
  });
  it("空态→0条", () => {
    expect(buildExperienceFreshnessV13([]).length).toBe(0);
  });
});

describe("experienceFreshnessV13Routes 读路由", () => {
  it("GET /api/v1/experience-freshness 路由存在且 auth:true", () => {
    const route = experienceFreshnessV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/experience-freshness",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
