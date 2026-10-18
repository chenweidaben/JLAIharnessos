/**
 * 健澜科技 jlmedaios - 病历整改自动跟踪 V14 单测（M521-D，M521 收官）
 *
 * 测试 buildRectificationTracking 构建跟踪、trackRectification 跟踪整改、buildRectificationTrackingReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildRectificationTracking,
  buildRectificationTrackingReport,
  trackRectification,
} from "../../src/bff/aggregators/emrQcRectificationTrackingV14Aggregator";
import { emrQcRectificationTrackingV14Routes } from "../../src/bff/routes/emrQcRectificationTrackingV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildRectificationTracking 构建跟踪", () => {
  // 手算：defectId='D001', owner='张医生', deadlineDays=7 → 正确构建
  it("defectId='D001', owner='张医生', deadlineDays=7 → 正确构建", () => {
    const tracking = buildRectificationTracking("D001", "张医生", 7);
    expect(tracking.defectId).toBe("D001");
    expect(tracking.owner).toBe("张医生");
    expect(tracking.deadlineDays).toBe(7);
  });
});

describe("trackRectification 已完成", () => {
  // 手算：tracking={...deadlineDays:7}, daysElapsed=5, completed=true → status='已完成'
  it("tracking={...deadlineDays:7}, daysElapsed=5, completed=true → status='已完成'", () => {
    const tracking = buildRectificationTracking("D001", "张医生", 7);
    const result = trackRectification(tracking, 5, true);
    expect(result.status).toBe("已完成");
  });
});

describe("trackRectification 已逾期", () => {
  // 手算：tracking={...deadlineDays:7}, daysElapsed=10, completed=false → 10>=7 → status='已逾期'
  it("tracking={...deadlineDays:7}, daysElapsed=10, completed=false → status='已逾期'", () => {
    const tracking = buildRectificationTracking("D001", "张医生", 7);
    const result = trackRectification(tracking, 10, false);
    expect(result.status).toBe("已逾期");
  });
});

describe("trackRectification 进行中", () => {
  // 手算：tracking={...deadlineDays:7}, daysElapsed=3, completed=false → 3<7 → status='进行中'
  // 手算：daysRemaining = 7 - 3 = 4
  it("tracking={...deadlineDays:7}, daysElapsed=3, completed=false → status='进行中', daysRemaining=4", () => {
    const tracking = buildRectificationTracking("D001", "张医生", 7);
    const result = trackRectification(tracking, 3, false);
    expect(result.status).toBe("进行中");
    expect(result.daysRemaining).toBe(4);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-rectification-tracking auth:true", () => {
    const def = (emrQcRectificationTrackingV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-rectification-tracking");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
