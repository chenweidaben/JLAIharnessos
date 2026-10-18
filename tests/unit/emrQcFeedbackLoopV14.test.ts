/**
 * 健澜科技 jlmedaios - 质控问题反馈闭环 V14 单测（M496-A）
 *
 * 测试 buildFeedbackLoop 构建、trackFeedbackStatus 跟踪、POST 路由 auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildFeedbackLoop,
  trackFeedbackStatus,
  type FeedbackLoopV14,
} from "../../src/bff/aggregators/emrQcFeedbackLoopV14Aggregator";
import { emrQcFeedbackLoopV14Routes } from "../../src/bff/routes/emrQcFeedbackLoopV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildFeedbackLoop 整改中", () => {
  // 手算：issue='缺主诉', status='整改中' → 正确构建
  it("issue='缺主诉', status='整改中' → 正确构建", () => {
    const record: FeedbackLoopV14 = buildFeedbackLoop("缺主诉", "整改中");
    expect(record.issue).toBe("缺主诉");
    expect(record.status).toBe("整改中");
  });
});

describe("trackFeedbackStatus 3条记录", () => {
  // 手算：3 条记录（2 已闭环/1 整改中）→ total=3, closed=2, rate=Math.ceil(2/3×100)=67
  it("3 条记录（2 已闭环/1 整改中）→ total=3, closed=2, rate=67", () => {
    const records = [
      { issue: "缺主诉", status: "整改中" },
      { issue: "超时限", status: "已闭环" },
      { issue: "用词不规范", status: "已闭环" },
    ];
    const result = trackFeedbackStatus(records);
    expect(result.total).toBe(3);
    expect(result.closed).toBe(2);
    expect(result.rate).toBe(67);
  });
});

describe("trackFeedbackStatus 空数组", () => {
  // 手算：空数组 → total=0, closed=0, rate=0
  it("空数组 → total=0, closed=0, rate=0", () => {
    const records: { issue: string; status: string }[] = [];
    const result = trackFeedbackStatus(records);
    expect(result.total).toBe(0);
    expect(result.closed).toBe(0);
    expect(result.rate).toBe(0);
  });
});

describe("buildFeedbackLoop 已闭环", () => {
  // 手算：issue='超时限', status='已闭环' → 正确构建
  it("issue='超时限', status='已闭环' → 正确构建", () => {
    const record: FeedbackLoopV14 = buildFeedbackLoop("超时限", "已闭环");
    expect(record.issue).toBe("超时限");
    expect(record.status).toBe("已闭环");
  });
});

describe("POST 路由", () => {
  it("POST /api/v1/emr-qc-feedback-loop auth:true", () => {
    const def = (emrQcFeedbackLoopV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-feedback-loop");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
