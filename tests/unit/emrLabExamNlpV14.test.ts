/**
 * 健澜科技 jlmedaios - 病历辅助检查 NLP 提取 V14 单测（M530-D，M530 收官）
 *
 * 测试 buildLabExamNlp 构建提取、extractLabExamStruct 辅助检查结构化提取、buildLabExamNlpReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildLabExamNlp,
  buildLabExamNlpReport,
  extractLabExamStruct,
  type LabExamNlpInputV14,
} from "../../src/bff/aggregators/emrLabExamNlpV14Aggregator";
import { emrLabExamNlpV14Routes } from "../../src/bff/routes/emrLabExamNlpV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildLabExamNlp 构建提取", () => {
  // 手算：recordId='REC073', dept='心内科' → 正确构建
  it("recordId='REC073', dept='心内科' → 正确构建", () => {
    const nlp = buildLabExamNlp("REC073", "心内科");
    expect(nlp.recordId).toBe("REC073");
    expect(nlp.dept).toBe("心内科");
  });
});

describe("extractLabExamStruct 含异常项", () => {
  // 手算：{rawText='白细胞 6.5\n血红蛋白 120↑\n血糖 5.6'}
  // 手算：split('\n') = ['白细胞 6.5','血红蛋白 120↑','血糖 5.6'] → examItems=3项
  // 手算：abnormalCount = filter(i => i.includes('↑') || i.includes('↓')).length = 1（仅'血红蛋白 120↑'含↑）
  it("{rawText='白细胞 6.5\\n血红蛋白 120↑\\n血糖 5.6'} → examItems 3项, abnormalCount=1", () => {
    const input: LabExamNlpInputV14 = { rawText: "白细胞 6.5\n血红蛋白 120↑\n血糖 5.6" };
    const result = extractLabExamStruct(input);
    expect(result.examItems).toEqual(["白细胞 6.5", "血红蛋白 120↑", "血糖 5.6"]);
    expect(result.abnormalCount).toBe(1);
  });
});

describe("extractLabExamStruct 全正常", () => {
  // 手算：{rawText='白细胞 6.5\n血糖 5.6'}
  // 手算：split('\n') = ['白细胞 6.5','血糖 5.6'] → examItems=2项
  // 手算：abnormalCount = 0（无↑↓）
  it("{rawText='白细胞 6.5\\n血糖 5.6'} → examItems 2项, abnormalCount=0", () => {
    const input: LabExamNlpInputV14 = { rawText: "白细胞 6.5\n血糖 5.6" };
    const result = extractLabExamStruct(input);
    expect(result.examItems).toEqual(["白细胞 6.5", "血糖 5.6"]);
    expect(result.abnormalCount).toBe(0);
  });
});

describe("buildLabExamNlpReport 构建报告", () => {
  // 手算：{abnormalCount:1, examTotal:3}
  // 手算：abnormalRate = Math.round(1/3*1000)/10 = Math.round(333.333...)/10 = 333/10 = 33.3
  it("{abnormalCount:1, examTotal:3} → abnormalRate=33.3", () => {
    const report = buildLabExamNlpReport({ abnormalCount: 1, examTotal: 3 });
    expect(report.abnormalCount).toBe(1);
    expect(report.abnormalRate).toBeCloseTo(33.3, 1);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-lab-exam-nlp auth:true", () => {
    const def = (emrLabExamNlpV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-lab-exam-nlp");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
