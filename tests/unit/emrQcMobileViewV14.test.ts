/**
 * 健澜科技 jlmedaios - 质控移动端查看 V14 单测（M526-B）
 *
 * 测试 buildMobileView 构建查看、viewOnMobile 移动端查看、buildMobileViewReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMobileView,
  buildMobileViewReport,
  viewOnMobile,
  type MobileViewInputV14,
} from "../../src/bff/aggregators/emrQcMobileViewV14Aggregator";
import { emrQcMobileViewV14Routes } from "../../src/bff/routes/emrQcMobileViewV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildMobileView 构建查看", () => {
  // 手算：recordId='REC030', viewer='李医生' → 正确构建
  it("recordId='REC030', viewer='李医生' → 正确构建", () => {
    const view = buildMobileView("REC030", "李医生");
    expect(view.recordId).toBe("REC030");
    expect(view.viewer).toBe("李医生");
  });
});

describe("viewOnMobile 多段落", () => {
  // 手算：{recordId:'REC030', sections=['入院记录','病程记录','出院小结']}
  // 手算：viewedSections = sections.length = 3
  // 手算：viewLength = '入院记录'(4)+'病程记录'(4)+'出院小结'(4) = 12
  //        注：规格原文写 11，实际函数逻辑为 12，按实际逻辑修正
  it("{recordId:'REC030', sections=['入院记录','病程记录','出院小结']} → viewedSections=3, viewLength=12", () => {
    const input: MobileViewInputV14 = {
      recordId: "REC030",
      sections: ["入院记录", "病程记录", "出院小结"],
    };
    const result = viewOnMobile(input);
    expect(result.viewedSections).toBe(3);
    expect(result.viewLength).toBe(12);
  });
});

describe("viewOnMobile 短列表", () => {
  // 手算：{recordId:'REC031', sections=['手术记录']}
  // 手算：viewedSections = 1
  // 手算：viewLength = '手术记录'(4) = 4
  it("{recordId:'REC031', sections=['手术记录']} → viewedSections=1, viewLength=4", () => {
    const input: MobileViewInputV14 = {
      recordId: "REC031",
      sections: ["手术记录"],
    };
    const result = viewOnMobile(input);
    expect(result.viewedSections).toBe(1);
    expect(result.viewLength).toBe(4);
  });
});

describe("buildMobileViewReport 构建报告", () => {
  // 手算：{viewedSections:3, viewLength:12}
  // 手算：透传 viewedSections + viewLength
  it("{viewedSections:3, viewLength:12} → 正确返回（透传）", () => {
    const report = buildMobileViewReport({ viewedSections: 3, viewLength: 12 });
    expect(report.viewedSections).toBe(3);
    expect(report.viewLength).toBe(12);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-mobile-view auth:true", () => {
    const def = (emrQcMobileViewV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-mobile-view");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
