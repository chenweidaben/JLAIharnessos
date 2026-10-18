/**
 * 健澜科技 jlmedaios - 病历 NLP 术语标准化 V14 单测（M531-B）
 *
 * 测试 buildNlpTermStandardize 构建标准化、standardizeMedicalTerm 术语标准化、buildNlpTermStandardizeReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildNlpTermStandardize,
  buildNlpTermStandardizeReport,
  standardizeMedicalTerm,
  type NlpTermStandardizeInputV14,
} from "../../src/bff/aggregators/emrNlpTermStandardizeV14Aggregator";
import { emrNlpTermStandardizeV14Routes } from "../../src/bff/routes/emrNlpTermStandardizeV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildNlpTermStandardize 构建标准化", () => {
  // 手算：termDomain='药品', source='通用名表' → 正确构建
  it("termDomain='药品', source='通用名表' → 正确构建", () => {
    const nlp = buildNlpTermStandardize("药品", "通用名表");
    expect(nlp.termDomain).toBe("药品");
    expect(nlp.source).toBe("通用名表");
  });
});

describe("standardizeMedicalTerm 缩写转全称", () => {
  // 手算：{rawTerm='APC', aliases={'APC':'阿司匹林','BTC':'维生素C'}}
  // 手算：aliases['APC'] = '阿司匹林' → standardTerm='阿司匹林'
  // 手算：isAbbreviated = '阿司匹林' !== 'APC' = true
  it("{rawTerm='APC', aliases={'APC':'阿司匹林','BTC':'维生素C'}} → standardTerm='阿司匹林', isAbbreviated=true", () => {
    const input: NlpTermStandardizeInputV14 = {
      rawTerm: "APC",
      aliases: { APC: "阿司匹林", BTC: "维生素C" },
    };
    const result = standardizeMedicalTerm(input);
    expect(result.standardTerm).toBe("阿司匹林");
    expect(result.isAbbreviated).toBe(true);
  });
});

describe("standardizeMedicalTerm 无映射", () => {
  // 手算：{rawTerm='布洛芬', aliases={'APC':'阿司匹林'}}
  // 手算：aliases['布洛芬'] = undefined → standardTerm='布洛芬'
  // 手算：isAbbreviated = '布洛芬' !== '布洛芬' = false
  it("{rawTerm='布洛芬', aliases={'APC':'阿司匹林'}} → standardTerm='布洛芬', isAbbreviated=false", () => {
    const input: NlpTermStandardizeInputV14 = {
      rawTerm: "布洛芬",
      aliases: { APC: "阿司匹林" },
    };
    const result = standardizeMedicalTerm(input);
    expect(result.standardTerm).toBe("布洛芬");
    expect(result.isAbbreviated).toBe(false);
  });
});

describe("buildNlpTermStandardizeReport 构建报告", () => {
  // 手算：{standardTerm:'阿司匹林', isAbbreviated:true}
  // 手算：透传 standardTerm + isAbbreviated
  it("{standardTerm:'阿司匹林', isAbbreviated:true} → 正确返回（透传）", () => {
    const report = buildNlpTermStandardizeReport({ standardTerm: "阿司匹林", isAbbreviated: true });
    expect(report.standardTerm).toBe("阿司匹林");
    expect(report.isAbbreviated).toBe(true);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-nlp-term-standardize auth:true", () => {
    const def = (emrNlpTermStandardizeV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-nlp-term-standardize");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
