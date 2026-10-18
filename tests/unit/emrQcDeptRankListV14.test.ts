/**
 * 健澜科技 jlmedaios - 科室质控排名（避让版）V14 单测（M542-B）
 *
 * 测试 buildQcDeptRankList 构建科室排名、rankQcDeptList 科室排名、buildQcDeptRankListReport 构建排名报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildQcDeptRankList,
  buildQcDeptRankListReport,
  rankQcDeptList,
  type QcDeptRankListInputV14,
} from "../../src/bff/aggregators/emrQcDeptRankListV14Aggregator";
import { emrQcDeptRankListV14Routes } from "../../src/bff/routes/emrQcDeptRankListV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildQcDeptRankList 构建科室排名", () => {
  // 手算：month='2026-10' → 正确构建
  it("month='2026-10' → 正确构建", () => {
    const base = buildQcDeptRankList("2026-10");
    expect(base.month).toBe("2026-10");
  });
});

describe("rankQcDeptList 多科室", () => {
  // 手算：{depts=[{name='心内科',score=95},{name='呼吸科',score=88},{name='普外科',score=92}]}
  // 手算：rankCount = depts.length = 3
  // 手算：topDept = reduce 最高分：心内科95 > 呼吸科88 → best=心内科95；心内科95 > 普外科92 → best=心内科95 → topDept='心内科'
  it("{depts=[心内科95,呼吸科88,普外科92]} → topDept='心内科', rankCount=3", () => {
    const input: QcDeptRankListInputV14 = {
      depts: [
        { name: "心内科", score: 95 },
        { name: "呼吸科", score: 88 },
        { name: "普外科", score: 92 },
      ],
    };
    const result = rankQcDeptList(input);
    expect(result.topDept).toBe("心内科");
    expect(result.rankCount).toBe(3);
  });
});

describe("rankQcDeptList 空列表", () => {
  // 手算：{depts=[]}
  // 手算：rankCount = depts.length = 0
  // 手算：topDept = depts.length>0 ? ... : '无科室' → depts=[] → topDept='无科室'
  it("{depts=[]} → topDept='无科室', rankCount=0", () => {
    const input: QcDeptRankListInputV14 = { depts: [] };
    const result = rankQcDeptList(input);
    expect(result.topDept).toBe("无科室");
    expect(result.rankCount).toBe(0);
  });
});

describe("buildQcDeptRankListReport 构建排名报告", () => {
  // 手算：{topDept='心内科', rankCount=3}
  // 手算：透传 topDept + rankCount
  it("{topDept='心内科', rankCount=3} → 正确返回（透传）", () => {
    const report = buildQcDeptRankListReport({ topDept: "心内科", rankCount: 3 });
    expect(report.topDept).toBe("心内科");
    expect(report.rankCount).toBe(3);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-dept-rank-list auth:true", () => {
    const def = (emrQcDeptRankListV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-dept-rank-list");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
