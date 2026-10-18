/**
 * 健澜科技 jlmedaios - 病历AI检验解读 V14 单测（M545-D，M545 收官）
 *
 * 测试 buildAiLabInterpret 构建 AI 检验解读、interpretLabByAi AI 检验解读、buildAiLabInterpretReport 构建检验解读报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiLabInterpret,
  buildAiLabInterpretReport,
  interpretLabByAi,
  type AiLabInterpretInputV14,
} from "../../src/bff/aggregators/emrAiLabInterpretV14Aggregator";
import { emrAiLabInterpretV14Routes } from "../../src/bff/routes/emrAiLabInterpretV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiLabInterpret 构建 AI 检验解读", () => {
  // 手算：recordId='RECB004', dept='心内科' → 正确构建
  it("recordId='RECB004', dept='心内科' → 正确构建", () => {
    const base = buildAiLabInterpret("RECB004", "心内科");
    expect(base.recordId).toBe("RECB004");
    expect(base.dept).toBe("心内科");
  });
});

describe("interpretLabByAi 显著升高", () => {
  // 手算：{item='肌钙蛋白I', value=0.5, refRange='<0.04'}
  // 手算：item.includes('肌钙蛋白') && value=0.5>0.04 → level='显著升高'
  // 手算：level='显著升高' → suggestion='警惕急性心梗可能'
  it("{item='肌钙蛋白I', value=0.5, refRange='<0.04'} → level='显著升高', suggestion='警惕急性心梗可能'", () => {
    const input: AiLabInterpretInputV14 = { item: "肌钙蛋白I", value: 0.5, refRange: "<0.04" };
    const result = interpretLabByAi(input);
    expect(result.level).toBe("显著升高");
    expect(result.suggestion).toBe("警惕急性心梗可能");
  });
});

describe("interpretLabByAi 正常", () => {
  // 手算：{item='白细胞', value=6.0, refRange='4-10'}
  // 手算：item.includes('肌钙蛋白') → false → level='正常'
  // 手算：level='正常' → suggestion='建议结合临床'
  it("{item='白细胞', value=6.0, refRange='4-10'} → level='正常', suggestion='建议结合临床'", () => {
    const input: AiLabInterpretInputV14 = { item: "白细胞", value: 6.0, refRange: "4-10" };
    const result = interpretLabByAi(input);
    expect(result.level).toBe("正常");
    expect(result.suggestion).toBe("建议结合临床");
  });
});

describe("buildAiLabInterpretReport 构建检验解读报告", () => {
  // 手算：{level='显著升高', suggestion='警惕急性心梗可能'}
  // 手算：透传 level + suggestion
  it("{level='显著升高', suggestion='警惕急性心梗可能'} → 正确返回（透传）", () => {
    const report = buildAiLabInterpretReport({ level: "显著升高", suggestion: "警惕急性心梗可能" });
    expect(report.level).toBe("显著升高");
    expect(report.suggestion).toBe("警惕急性心梗可能");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-lab-interpret auth:true", () => {
    const def = (emrAiLabInterpretV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-lab-interpret");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
