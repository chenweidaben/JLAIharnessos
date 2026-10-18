/**
 * 健澜科技 jlmedaios - 病历质控通知公告 V14 单测（M472-C）
 *
 * 测试 buildNotice 创建、filterNoticesByType 按类型过滤、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildNotice,
  filterNoticesByType,
  type QcNoticeV14,
} from "../../src/bff/aggregators/emrQcNoticeV14Aggregator";
import { emrQcNoticeV14Routes } from "../../src/bff/routes/emrQcNoticeV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildNotice 公告", () => {
  // 手算：title="质控月报发布", type='announcement' → 正确创建
  it("title='质控月报发布', type='announcement' → 正确", () => {
    const notice = buildNotice("质控月报发布", "2026年10月质控报告", "announcement");
    expect(notice.title).toBe("质控月报发布");
    expect(notice.type).toBe("announcement");
  });
});

describe("buildNotice 警告", () => {
  // 手算：type='warning' → 正确创建
  it("type='warning' → 正确", () => {
    const notice = buildNotice("缺陷率偏高", "内科缺陷率超过10%", "warning");
    expect(notice.type).toBe("warning");
  });
});

describe("filterNoticesByType 按类型过滤", () => {
  // 手算：2 announcement + 1 warning → filter('warning') 返回 1 条
  it("2 announcement + 1 warning → filter('warning') 返回 1 条", () => {
    const notices: QcNoticeV14[] = [
      { id: "N1", title: "T1", content: "C1", type: "announcement", date: "2026-10-01" },
      { id: "N2", title: "T2", content: "C2", type: "announcement", date: "2026-10-02" },
      { id: "N3", title: "T3", content: "C3", type: "warning", date: "2026-10-03" },
    ];
    const filtered = filterNoticesByType(notices, "warning");
    expect(filtered.length).toBe(1);
    expect(filtered[0]?.type).toBe("warning");
  });
});

describe("filterNoticesByType 空 filter", () => {
  // 手算：空 filter → 返回全部（3 条）
  it("空 filter → 返回全部", () => {
    const notices: QcNoticeV14[] = [
      { id: "N1", title: "T1", content: "C1", type: "announcement", date: "2026-10-01" },
      { id: "N2", title: "T2", content: "C2", type: "announcement", date: "2026-10-02" },
      { id: "N3", title: "T3", content: "C3", type: "warning", date: "2026-10-03" },
    ];
    expect(filterNoticesByType(notices, "").length).toBe(3);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-notice auth:true", () => {
    const def = (emrQcNoticeV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-notice");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
