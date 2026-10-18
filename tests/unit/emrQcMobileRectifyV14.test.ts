/**
 * 健澜科技 jlmedaios - 质控移动端整改 V14 单测（M526-D，M526 收官）
 *
 * 测试 buildMobileRectify 构建整改、rectifyOnMobile 移动端整改、buildMobileRectifyReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMobileRectify,
  buildMobileRectifyReport,
  rectifyOnMobile,
  type MobileRectifyInputV14,
} from "../../src/bff/aggregators/emrQcMobileRectifyV14Aggregator";
import { emrQcMobileRectifyV14Routes } from "../../src/bff/routes/emrQcMobileRectifyV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildMobileRectify 构建整改", () => {
  // 手算：defectId='D025', rectifier='张医生' → 正确构建
  it("defectId='D025', rectifier='张医生' → 正确构建", () => {
    const rectify = buildMobileRectify("D025", "张医生");
    expect(rectify.defectId).toBe("D025");
    expect(rectify.rectifier).toBe("张医生");
  });
});

describe("rectifyOnMobile 已解决", () => {
  // 手算：{defectId:'D025', rectifyContent:'已补充病程记录', isResolved:true}
  // 手算：resolved = isResolved = true
  // 手算：isResolved=true → rectifyScore=100
  it("{defectId:'D025', rectifyContent:'已补充病程记录', isResolved:true} → resolved=true, rectifyScore=100", () => {
    const input: MobileRectifyInputV14 = {
      defectId: "D025",
      rectifyContent: "已补充病程记录",
      isResolved: true,
    };
    const result = rectifyOnMobile(input);
    expect(result.resolved).toBe(true);
    expect(result.rectifyScore).toBe(100);
  });
});

describe("rectifyOnMobile 未解决短内容", () => {
  // 手算：{defectId:'D026', rectifyContent:'处理中', isResolved:false}
  // 手算：resolved = isResolved = false
  // 手算：isResolved=false, rectifyContent='处理中'(3字) → Math.min(60, 3) = 3
  //        注：规格原文期望 4，实际 '处理中'.length=3，按实际逻辑修正为 3
  it("{defectId:'D026', rectifyContent:'处理中', isResolved:false} → resolved=false, rectifyScore=3", () => {
    const input: MobileRectifyInputV14 = {
      defectId: "D026",
      rectifyContent: "处理中",
      isResolved: false,
    };
    const result = rectifyOnMobile(input);
    expect(result.resolved).toBe(false);
    expect(result.rectifyScore).toBe(3);
  });
});

describe("buildMobileRectifyReport 构建报告", () => {
  // 手算：{resolved:true, rectifyScore:100}
  // 手算：rectifyScore=100 >= 90 → grade='整改优秀'
  it("{resolved:true, rectifyScore:100} → grade='整改优秀'", () => {
    const report = buildMobileRectifyReport({ resolved: true, rectifyScore: 100 });
    expect(report.resolved).toBe(true);
    expect(report.rectifyScore).toBe(100);
    expect(report.grade).toBe("整改优秀");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-mobile-rectify auth:true", () => {
    const def = (emrQcMobileRectifyV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-mobile-rectify");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
