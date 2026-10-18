/**
 * 健澜科技 jlmedaios - 病历缺陷闭环跟踪 V14 单测（M527-D，M527 收官）
 *
 * 测试 buildDefectClosedLoop 构建跟踪、trackDefectResolution 闭环跟踪、buildDefectClosedLoopReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDefectClosedLoop,
  buildDefectClosedLoopReport,
  trackDefectResolution,
  type DefectClosedLoopInputV14,
} from "../../src/bff/aggregators/emrDefectClosedLoopV14Aggregator";
import { emrDefectClosedLoopV14Routes } from "../../src/bff/routes/emrDefectClosedLoopV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDefectClosedLoop 构建跟踪", () => {
  // 手算：defectId='D030', dept='心内科' → 正确构建
  it("defectId='D030', dept='心内科' → 正确构建", () => {
    const track = buildDefectClosedLoop("D030", "心内科");
    expect(track.defectId).toBe("D030");
    expect(track.dept).toBe("心内科");
  });
});

describe("trackDefectResolution 已闭环", () => {
  // 手算：{defectId:'D030', raisedDate='2026-10-10', resolvedDate='2026-10-13', status='已闭环'}
  // 手算：isClosed = status === '已闭环' = true
  // 手算：closedDays = Math.ceil((new Date('2026-10-13') - new Date('2026-10-10')) / (1000*60*60*24))
  //        差值 = 3 天 → Math.ceil(3) = 3
  it("{defectId:'D030', raisedDate='2026-10-10', resolvedDate='2026-10-13', status='已闭环'} → isClosed=true, closedDays=3", () => {
    const input: DefectClosedLoopInputV14 = {
      defectId: "D030",
      raisedDate: "2026-10-10",
      resolvedDate: "2026-10-13",
      status: "已闭环",
    };
    const result = trackDefectResolution(input);
    expect(result.isClosed).toBe(true);
    expect(result.closedDays).toBe(3);
  });
});

describe("trackDefectResolution 未闭环", () => {
  // 手算：{defectId:'D031', raisedDate='2026-10-15', resolvedDate:null, status='整改中'}
  // 手算：isClosed = status === '已闭环' = false（status='整改中'）
  // 手算：resolvedDate=null → closedDays=0
  it("{defectId:'D031', raisedDate='2026-10-15', resolvedDate:null, status='整改中'} → isClosed=false, closedDays=0", () => {
    const input: DefectClosedLoopInputV14 = {
      defectId: "D031",
      raisedDate: "2026-10-15",
      resolvedDate: null,
      status: "整改中",
    };
    const result = trackDefectResolution(input);
    expect(result.isClosed).toBe(false);
    expect(result.closedDays).toBe(0);
  });
});

describe("buildDefectClosedLoopReport 构建报告", () => {
  // 手算：{closedDays:3, isClosed:true}
  // 手算：isClosed=true → hint='已闭环'
  it("{closedDays:3, isClosed:true} → hint='已闭环'", () => {
    const report = buildDefectClosedLoopReport({ closedDays: 3, isClosed: true });
    expect(report.closedDays).toBe(3);
    expect(report.isClosed).toBe(true);
    expect(report.hint).toBe("已闭环");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-defect-closed-loop auth:true", () => {
    const def = (emrDefectClosedLoopV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-defect-closed-loop");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
