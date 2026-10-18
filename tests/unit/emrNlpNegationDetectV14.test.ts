/**
 * 健澜科技 jlmedaios - 病历 NLP 否定检测 V14 单测（M531-D，M531 收官）
 *
 * 测试 buildNlpNegationDetect 构建检测、detectNegationScope 否定检测、buildNlpNegationDetectReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildNlpNegationDetect,
  buildNlpNegationDetectReport,
  detectNegationScope,
  type NlpNegationDetectInputV14,
} from "../../src/bff/aggregators/emrNlpNegationDetectV14Aggregator";
import { emrNlpNegationDetectV14Routes } from "../../src/bff/routes/emrNlpNegationDetectV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildNlpNegationDetect 构建检测", () => {
  // 手算：recordId='REC081', dept='呼吸科' → 正确构建
  it("recordId='REC081', dept='呼吸科' → 正确构建", () => {
    const nlp = buildNlpNegationDetect("REC081", "呼吸科");
    expect(nlp.recordId).toBe("REC081");
    expect(nlp.dept).toBe("呼吸科");
  });
});

describe("detectNegationScope 否定", () => {
  // 手算：{sentence='患者无胸痛症状', target='胸痛'}
  // 手算：sentence.includes('无胸痛') = '患者无胸痛症状'.includes('无胸痛') = true
  // 手算：isNegated=true → scope='否定范围'
  it("{sentence='患者无胸痛症状', target='胸痛'} → isNegated=true, scope='否定范围'", () => {
    const input: NlpNegationDetectInputV14 = { sentence: "患者无胸痛症状", target: "胸痛" };
    const result = detectNegationScope(input);
    expect(result.isNegated).toBe(true);
    expect(result.scope).toBe("否定范围");
  });
});

describe("detectNegationScope 肯定", () => {
  // 手算：{sentence='患者有咳嗽咳痰', target='咳嗽'}
  // 手算：sentence.includes('无咳嗽')=false, includes('未见咳嗽')=false, includes('否认咳嗽')=false → isNegated=false
  // 手算：isNegated=false → scope='肯定范围'
  it("{sentence='患者有咳嗽咳痰', target='咳嗽'} → isNegated=false, scope='肯定范围'", () => {
    const input: NlpNegationDetectInputV14 = { sentence: "患者有咳嗽咳痰", target: "咳嗽" };
    const result = detectNegationScope(input);
    expect(result.isNegated).toBe(false);
    expect(result.scope).toBe("肯定范围");
  });
});

describe("buildNlpNegationDetectReport 构建报告", () => {
  // 手算：{isNegated:true, scope:'否定范围'}
  // 手算：透传 isNegated + scope
  it("{isNegated:true, scope:'否定范围'} → 正确返回（透传）", () => {
    const report = buildNlpNegationDetectReport({ isNegated: true, scope: "否定范围" });
    expect(report.isNegated).toBe(true);
    expect(report.scope).toBe("否定范围");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-nlp-negation-detect auth:true", () => {
    const def = (emrNlpNegationDetectV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-nlp-negation-detect");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
