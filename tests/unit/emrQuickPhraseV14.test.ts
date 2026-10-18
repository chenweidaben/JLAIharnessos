/**
 * 健澜科技 jlmedaios - 病历常见用语快捷输入 V14 单测（M539-C）
 *
 * 测试 buildQuickPhrase 构建快捷用语、searchQuickPhrase 快捷用语搜索、buildQuickPhraseReport 构建搜索报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildQuickPhrase,
  buildQuickPhraseReport,
  searchQuickPhrase,
  type PhraseItemV14,
  type QuickPhraseInputV14,
} from "../../src/bff/aggregators/emrQuickPhraseV14Aggregator";
import { emrQuickPhraseV14Routes } from "../../src/bff/routes/emrQuickPhraseV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildQuickPhrase 构建快捷用语", () => {
  // 手算：category='主诉', doctorId='D001' → 正确构建
  it("category='主诉', doctorId='D001' → 正确构建", () => {
    const base = buildQuickPhrase("主诉", "D001");
    expect(base.category).toBe("主诉");
    expect(base.doctorId).toBe("D001");
  });
});

describe("searchQuickPhrase 多匹配", () => {
  // 手算：{query='胸闷', phrases=[{id='P1',text='胸闷3天'},{id='P2',text='胸痛1周'},{id='P3',text='胸闷伴气短'}]}
  // 手算：matched = phrases.filter(p => p.text.includes('胸闷'))
  //   '胸闷3天'.includes('胸闷') = true
  //   '胸痛1周'.includes('胸闷') = false
  //   '胸闷伴气短'.includes('胸闷') = true
  //   matched = [胸闷3天, 胸闷伴气短] → matchedCount=2
  //   firstPhrase = matched[0].text = '胸闷3天'
  it("{query='胸闷', phrases=[3条]} → matchedCount=2, firstPhrase='胸闷3天'", () => {
    const phrases: PhraseItemV14[] = [
      { id: "P1", text: "胸闷3天" },
      { id: "P2", text: "胸痛1周" },
      { id: "P3", text: "胸闷伴气短" },
    ];
    const input: QuickPhraseInputV14 = { query: "胸闷", phrases };
    const result = searchQuickPhrase(input);
    expect(result.matchedCount).toBe(2);
    expect(result.firstPhrase).toBe("胸闷3天");
  });
});

describe("searchQuickPhrase 无匹配", () => {
  // 手算：{query='腹痛', phrases=[{id='P1',text='胸闷3天'},{id='P2',text='胸痛1周'}]}
  // 手算：matched = phrases.filter(p => p.text.includes('腹痛'))
  //   '胸闷3天'.includes('腹痛') = false
  //   '胸痛1周'.includes('腹痛') = false
  //   matched = [] → matchedCount=0
  //   firstPhrase = '无匹配'
  it("{query='腹痛', phrases=[2条]} → matchedCount=0, firstPhrase='无匹配'", () => {
    const phrases: PhraseItemV14[] = [
      { id: "P1", text: "胸闷3天" },
      { id: "P2", text: "胸痛1周" },
    ];
    const input: QuickPhraseInputV14 = { query: "腹痛", phrases };
    const result = searchQuickPhrase(input);
    expect(result.matchedCount).toBe(0);
    expect(result.firstPhrase).toBe("无匹配");
  });
});

describe("buildQuickPhraseReport 构建搜索报告", () => {
  // 手算：{matchedCount=2, firstPhrase='胸闷3天'}
  // 手算：透传 matchedCount + firstPhrase
  it("{matchedCount=2, firstPhrase='胸闷3天'} → 正确返回（透传）", () => {
    const report = buildQuickPhraseReport({ matchedCount: 2, firstPhrase: "胸闷3天" });
    expect(report.matchedCount).toBe(2);
    expect(report.firstPhrase).toBe("胸闷3天");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-quick-phrase auth:true", () => {
    const def = (emrQuickPhraseV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-quick-phrase");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
