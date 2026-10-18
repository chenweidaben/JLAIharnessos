/**
 * 健澜科技 jlmedaios - 质控整改通知单自动生成 V14 单测（M518-C）
 *
 * 测试 buildRectificationNotice 构建通知单、generateRectificationNotice 生成统计、buildRectificationNoticeSummary 构建摘要、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildRectificationNotice,
  buildRectificationNoticeSummary,
  generateRectificationNotice,
  type RectificationDefectsV14,
} from "../../src/bff/aggregators/emrQcRectificationNoticeV14Aggregator";
import { emrQcRectificationNoticeV14Routes } from "../../src/bff/routes/emrQcRectificationNoticeV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildRectificationNotice 构建通知单", () => {
  // 手算：noticeId='GZ20261019001', dept='普外科', issue='病程记录不及时' → 正确构建
  it("noticeId='GZ20261019001', dept='普外科', issue='病程记录不及时' → 正确构建", () => {
    const notice = buildRectificationNotice("GZ20261019001", "普外科", "病程记录不及时");
    expect(notice.noticeId).toBe("GZ20261019001");
    expect(notice.dept).toBe("普外科");
    expect(notice.issue).toBe("病程记录不及时");
  });
});

describe("generateRectificationNotice 生成统计", () => {
  // 手算：defects={block:2, major:4, minor:6} → defectCount=2+4+6=12
  // 手算：score=100-2×15-4×8-6×3=100-30-32-18=20
  // 手算：deadlineDays=7（整数，Math.ceil(7)=7）
  it("defects={block:2, major:4, minor:6}, deadlineDays=7 → defectCount=12, score=20, deadlineDays=7", () => {
    const notice = buildRectificationNotice("GZ20261019001", "普外科", "病程记录不及时");
    const defects: RectificationDefectsV14 = { block: 2, major: 4, minor: 6 };
    const result = generateRectificationNotice(notice, defects, 7);
    expect(result.defectCount).toBe(12);
    expect(result.score).toBe(20);
    expect(result.deadlineDays).toBe(7);
  });
});

describe("buildRectificationNoticeSummary 构建摘要", () => {
  // 手算：score=20 < 60 → priority='紧急'
  it("{defectCount:12, score:20} → priority='紧急'", () => {
    const summary = buildRectificationNoticeSummary({ defectCount: 12, score: 20 });
    expect(summary.priority).toBe("紧急");
  });
});

describe("generateRectificationNotice 满分场景", () => {
  // 手算：defects={block:0, major:0, minor:0} → defectCount=0, score=100（无扣分）
  // 手算：deadlineDays=3.2 → Math.ceil(3.2)=4（向上取整）
  it("defects={block:0, major:0, minor:0}, deadlineDays=3.2 → defectCount=0, score=100, deadlineDays=4", () => {
    const notice = buildRectificationNotice("GZ20261019001", "普外科", "病程记录不及时");
    const defects: RectificationDefectsV14 = { block: 0, major: 0, minor: 0 };
    const result = generateRectificationNotice(notice, defects, 3.2);
    expect(result.defectCount).toBe(0);
    expect(result.score).toBe(100);
    expect(result.deadlineDays).toBe(4);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-rectification-notice auth:true", () => {
    const def = (emrQcRectificationNoticeV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-rectification-notice");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
