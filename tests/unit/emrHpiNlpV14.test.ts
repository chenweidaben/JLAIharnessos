/**
 * 健澜科技 jlmedaios - 病历现病史结构化提取 V14 单测（M529-B）
 *
 * 测试 buildHpiNlp 构建提取、extractHpiStruct 现病史结构化提取、buildHpiNlpReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildHpiNlp,
  buildHpiNlpReport,
  extractHpiStruct,
  type HpiNlpInputV14,
} from "../../src/bff/aggregators/emrHpiNlpV14Aggregator";
import { emrHpiNlpV14Routes } from "../../src/bff/routes/emrHpiNlpV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildHpiNlp 构建提取", () => {
  // 手算：recordId='REC061', dept='心内科' → 正确构建
  it("recordId='REC061', dept='心内科' → 正确构建", () => {
    const nlp = buildHpiNlp("REC061", "心内科");
    expect(nlp.recordId).toBe("REC061");
    expect(nlp.dept).toBe("心内科");
  });
});

describe("extractHpiStruct 三段", () => {
  // 手算：{rawText='3天前无明显诱因出现胸痛。伴胸闷气促。自行含服硝酸甘油缓解。'}
  // 手算：split('。') = ['3天前无明显诱因出现胸痛', '伴胸闷气促', '自行含服硝酸甘油缓解', '']
  // 手算：onset='3天前无明显诱因出现胸痛', course='伴胸闷气促', treatment='自行含服硝酸甘油缓解'
  // 手算：hasInfo = rawText.length > 0 = true
  it("{rawText='3天前无明显诱因出现胸痛。伴胸闷气促。自行含服硝酸甘油缓解。'} → onset='3天前无明显诱因出现胸痛', course='伴胸闷气促', treatment='自行含服硝酸甘油缓解', hasInfo=true", () => {
    const input: HpiNlpInputV14 = {
      rawText: "3天前无明显诱因出现胸痛。伴胸闷气促。自行含服硝酸甘油缓解。",
    };
    const result = extractHpiStruct(input);
    expect(result.onset).toBe("3天前无明显诱因出现胸痛");
    expect(result.course).toBe("伴胸闷气促");
    expect(result.treatment).toBe("自行含服硝酸甘油缓解");
    expect(result.hasInfo).toBe(true);
  });
});

describe("extractHpiStruct 仅一段", () => {
  // 手算：{rawText='胸痛1周'}
  // 手算：split('。') = ['胸痛1周'] → onset='胸痛1周', course='', treatment=''
  // 手算：hasInfo = rawText.length > 0 = true
  it("{rawText='胸痛1周'} → onset='胸痛1周', course='', treatment='', hasInfo=true", () => {
    const input: HpiNlpInputV14 = { rawText: "胸痛1周" };
    const result = extractHpiStruct(input);
    expect(result.onset).toBe("胸痛1周");
    expect(result.course).toBe("");
    expect(result.treatment).toBe("");
    expect(result.hasInfo).toBe(true);
  });
});

describe("buildHpiNlpReport 构建报告", () => {
  // 手算：{hasInfo:true, fieldCount:4}
  // 手算：透传 hasInfo + fieldCount
  it("{hasInfo:true, fieldCount:4} → 正确返回（透传）", () => {
    const report = buildHpiNlpReport({ onset: "", course: "", treatment: "", hasInfo: true });
    expect(report.hasInfo).toBe(true);
    expect(report.fieldCount).toBe(4);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-hpi-nlp auth:true", () => {
    const def = (emrHpiNlpV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-hpi-nlp");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
