/**
 * 健澜科技 jlmedaios - NLP 病历事件提取 V14 单测（M490-C）
 *
 * 测试 extractMedicalEvents 提取、buildEventReport 构建、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  extractMedicalEvents,
  buildEventReport,
  type NlpEventResultV14,
} from "../../src/bff/aggregators/emrNlpEventV14Aggregator";
import { emrNlpEventV14Routes } from "../../src/bff/routes/emrNlpEventV14";
import type { RouteDef } from "../../src/bff/types";

describe("extractMedicalEvents 入院行阑尾切除术", () => {
  // 手算：含"入院行阑尾切除术" → events 非空
  it("含'入院行阑尾切除术' → events 非空", () => {
    const result = extractMedicalEvents("患者入院后行阑尾切除术");
    expect(result.events.length).toBeGreaterThan(0);
  });
});

describe("extractMedicalEvents 空内容", () => {
  // 手算：空内容 → events=[]
  it("空内容 → events=[]", () => {
    const result = extractMedicalEvents("");
    expect(result.events).toEqual([]);
  });
});

describe("buildEventReport 3个事件", () => {
  // 手算：events=['入院','手术','用药'] → eventCount=3
  it("events=['入院','手术','用药'] → eventCount=3", () => {
    const result: NlpEventResultV14 = { events: ["入院", "手术", "用药"] };
    const report = buildEventReport(result);
    expect(report.eventCount).toBe(3);
  });
});

describe("buildEventReport 空事件", () => {
  // 手算：events=[] → eventCount=0
  it("events=[] → eventCount=0", () => {
    const result: NlpEventResultV14 = { events: [] };
    const report = buildEventReport(result);
    expect(report.eventCount).toBe(0);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-nlp-event auth:true", () => {
    const def = (emrNlpEventV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-nlp-event");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
