/**
 * 健澜科技 jlmedaios - 病历缺陷自动分发 V14 单测（M521-C）
 *
 * 测试 buildDefectAutoRoute 构建分发、routeDefect 自动分发、buildDefectAutoRouteReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDefectAutoRoute,
  buildDefectAutoRouteReport,
  routeDefect,
  type DefectHandlerV14,
} from "../../src/bff/aggregators/emrQcDefectAutoRouteV14Aggregator";
import { emrQcDefectAutoRouteV14Routes } from "../../src/bff/routes/emrQcDefectAutoRouteV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDefectAutoRoute 构建分发", () => {
  // 手算：defectId='D001', dept='心内科', defectType='时限类' → 正确构建
  it("defectId='D001', dept='心内科', defectType='时限类' → 正确构建", () => {
    const defect = buildDefectAutoRoute("D001", "心内科", "时限类");
    expect(defect.defectId).toBe("D001");
    expect(defect.dept).toBe("心内科");
    expect(defect.defectType).toBe("时限类");
  });
});

describe("routeDefect 匹配成功", () => {
  // 手算：defect={...defectType:'时限类'}, handlers=[{type:'时限类',handler:'王质控'},{type:'完整性类',handler:'李质控'}]
  // 手算：handlers 中 type='时限类' 匹配 defect.defectType='时限类' → routedTo='王质控', matched=true
  it("defect={...defectType:'时限类'}, handlers=[{type:'时限类',handler:'王质控'},{type:'完整性类',handler:'李质控'}] → routedTo='王质控', matched=true", () => {
    const defect = buildDefectAutoRoute("D001", "心内科", "时限类");
    const handlers: DefectHandlerV14[] = [
      { type: "时限类", handler: "王质控" },
      { type: "完整性类", handler: "李质控" },
    ];
    const result = routeDefect(defect, handlers);
    expect(result.routedTo).toBe("王质控");
    expect(result.matched).toBe(true);
  });
});

describe("routeDefect 无匹配", () => {
  // 手算：defect={...defectType:'安全类'}, handlers=[{type:'时限类',handler:'王质控'},{type:'完整性类',handler:'李质控'}]
  // 手算：handlers 中无 type='安全类' → routedTo='质控办', matched=false（走默认）
  it("defect={...defectType:'安全类'}, handlers=[{type:'时限类',handler:'王质控'},{type:'完整性类',handler:'李质控'}] → routedTo='质控办', matched=false", () => {
    const defect = buildDefectAutoRoute("D001", "心内科", "安全类");
    const handlers: DefectHandlerV14[] = [
      { type: "时限类", handler: "王质控" },
      { type: "完整性类", handler: "李质控" },
    ];
    const result = routeDefect(defect, handlers);
    expect(result.routedTo).toBe("质控办");
    expect(result.matched).toBe(false);
  });
});

describe("buildDefectAutoRouteReport 构建报告", () => {
  // 手算：{routedTo='王质控', matched:true} → 正确返回（透传）
  it("{routedTo='王质控', matched:true} → 正确返回", () => {
    const report = buildDefectAutoRouteReport({ routedTo: "王质控", matched: true });
    expect(report.routedTo).toBe("王质控");
    expect(report.matched).toBe(true);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-defect-auto-route auth:true", () => {
    const def = (emrQcDefectAutoRouteV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-defect-auto-route");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
