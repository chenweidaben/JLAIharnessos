/**
 * 健澜科技 jlmedaios - 质控全院人员排名 V14 单测（M494-D，M494 收官）
 *
 * 测试 buildStaffRanking 构建、rankStaff 排名、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildStaffRanking,
  rankStaff,
  type StaffRankingV14,
  type StaffScoreV14,
} from "../../src/bff/aggregators/emrQcStaffRankingV14Aggregator";
import { emrQcStaffRankingV14Routes } from "../../src/bff/routes/emrQcStaffRankingV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildStaffRanking 张医生第1", () => {
  // 手算：staff='张医生', score=95, rank=1 → 正确构建
  it("staff='张医生', score=95, rank=1 → 正确构建", () => {
    const ranking: StaffRankingV14 = buildStaffRanking("张医生", 95, 1);
    expect(ranking.staff).toBe("张医生");
    expect(ranking.score).toBe(95);
    expect(ranking.rank).toBe(1);
  });
});

describe("rankStaff 3人员", () => {
  // 手算：[{张医生,92},{王护士,85},{陈主任,95}] → 排名后第一名=陈主任（95>92>85）
  it("3 人员排名后第一名=陈主任（95>92>85）", () => {
    const staffs: StaffScoreV14[] = [
      { staff: "张医生", score: 92 },
      { staff: "王护士", score: 85 },
      { staff: "陈主任", score: 95 },
    ];
    const rankings = rankStaff(staffs);
    expect(rankings[0].staff).toBe("陈主任");
    expect(rankings[0].rank).toBe(1);
    expect(rankings[1].staff).toBe("张医生");
    expect(rankings[1].rank).toBe(2);
    expect(rankings[2].staff).toBe("王护士");
    expect(rankings[2].rank).toBe(3);
  });
});

describe("rankStaff 空数组", () => {
  // 手算：空数组 → 返回空数组
  it("空数组 → 返回空数组", () => {
    const staffs: StaffScoreV14[] = [];
    const rankings = rankStaff(staffs);
    expect(rankings.length).toBe(0);
  });
});

describe("buildStaffRanking 李医生第3", () => {
  // 手算：staff='李医生', score=88, rank=3 → 正确构建
  it("staff='李医生', score=88, rank=3 → 正确构建", () => {
    const ranking: StaffRankingV14 = buildStaffRanking("李医生", 88, 3);
    expect(ranking.staff).toBe("李医生");
    expect(ranking.score).toBe(88);
    expect(ranking.rank).toBe(3);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-staff-ranking auth:true", () => {
    const def = (emrQcStaffRankingV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-staff-ranking");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
