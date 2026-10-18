/**
 * 健澜科技 jlmedaios - 病历AI检验解读明细 V14 单测（M550-D，M550 收官）
 *
 * 测试 buildAiLabInterpretDetail 构建 AI 检验解读明细、interpretLabByAi AI 检验解读明细、buildAiLabInterpretDetailReport 构建检验解读明细报告、读路由 GET auth:true。
 * 避让说明：M545-D 已有 emrAiLabInterpretV14，本切片用 -detail 后缀避让。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiLabInterpretDetail,
  buildAiLabInterpretDetailReport,
  interpretLabByAi,
  type AiLabInterpretDetailInputV14,
} from "../../src/bff/aggregators/emrAiLabInterpretDetailV14Aggregator";
import { emrAiLabInterpretDetailV14Routes } from "../../src/bff/routes/emrAiLabInterpretDetailV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiLabInterpretDetail 构建 AI 检验解读明细", () => {
  // 手算：recordId='RECB024', dept='检验科' → 正确构建
  it("recordId='RECB024', dept='检验科' → 正确构建", () => {
    const base = buildAiLabInterpretDetail("RECB024", "检验科");
    expect(base.recordId).toBe("RECB024");
    expect(base.dept).toBe("检验科");
  });
});

describe("interpretLabByAi 偏高", () => {
  // 手算：{item='血糖', value=8.5, refLow=3.9, refHigh=6.1}
  // 手算：value=8.5 > refHigh=6.1 → status='偏高'
  // 手算：status='偏高' → advice='建议复查并结合临床'
  it("{item='血糖', value=8.5, refLow=3.9, refHigh=6.1} → status='偏高', advice='建议复查并结合临床'", () => {
    const input: AiLabInterpretDetailInputV14 = { item: "血糖", value: 8.5, refLow: 3.9, refHigh: 6.1 };
    const result = interpretLabByAi(input);
    expect(result.status).toBe("偏高");
    expect(result.advice).toBe("建议复查并结合临床");
  });
});

describe("interpretLabByAi 正常", () => {
  // 手算：{item='白细胞', value=6.0, refLow=4.0, refHigh=10.0}
  // 手算：refLow=4.0 <= value=6.0 <= refHigh=10.0 → status='正常'
  // 手算：status='正常' → advice='无需特殊处理'
  it("{item='白细胞', value=6.0, refLow=4.0, refHigh=10.0} → status='正常', advice='无需特殊处理'", () => {
    const input: AiLabInterpretDetailInputV14 = { item: "白细胞", value: 6.0, refLow: 4.0, refHigh: 10.0 };
    const result = interpretLabByAi(input);
    expect(result.status).toBe("正常");
    expect(result.advice).toBe("无需特殊处理");
  });
});

describe("buildAiLabInterpretDetailReport 构建检验解读明细报告", () => {
  // 手算：{status='偏高', advice='...'}
  // 手算：透传 status + advice
  it("{status='偏高', advice='...'} → 正确返回（透传）", () => {
    const report = buildAiLabInterpretDetailReport({ status: "偏高", advice: "建议复查并结合临床" });
    expect(report.status).toBe("偏高");
    expect(report.advice).toBe("建议复查并结合临床");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-lab-interpret-detail auth:true", () => {
    const def = (emrAiLabInterpretDetailV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-lab-interpret-detail");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
