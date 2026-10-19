/**
 * 健澜科技 jlmedaios - 病历AI麻醉深度监测建议 V14 单测（M562-C）
 *
 * 测试 buildAiAnesthesiaDepthSuggest 构建 AI 麻醉深度监测建议、suggestAnesthesiaDepthByAi AI 麻醉深度监测建议、buildAiAnesthesiaDepthSuggestReport 构建麻醉深度监测建议报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiAnesthesiaDepthSuggest,
  buildAiAnesthesiaDepthSuggestReport,
  suggestAnesthesiaDepthByAi,
  type AiAnesthesiaDepthSuggestInputV14,
} from "../../src/bff/aggregators/emrAiAnesthesiaDepthSuggestV14Aggregator";
import { emrAiAnesthesiaDepthSuggestV14Routes } from "../../src/bff/routes/emrAiAnesthesiaDepthSuggestV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiAnesthesiaDepthSuggest 构建 AI 麻醉深度监测建议", () => {
  // 手算：recordId='RECB072', dept='麻醉科' → 正确构建
  it("recordId='RECB072', dept='麻醉科' → 正确构建", () => {
    const base = buildAiAnesthesiaDepthSuggest("RECB072", "麻醉科");
    expect(base.recordId).toBe("RECB072");
    expect(base.dept).toBe("麻醉科");
  });
});

describe("suggestAnesthesiaDepthByAi 心脏手术", () => {
  // 手算：{surgeryType='心脏搭桥手术', patientAge=60}
  // 手算：bisTarget = '心脏搭桥手术'.includes('心脏')=true → 35
  // 手算：monitoringAdvice = 60>=70=false → '常规监测即可'
  it("{surgeryType='心脏搭桥手术', patientAge=60} → bisTarget=35, monitoringAdvice='常规监测即可'", () => {
    const input: AiAnesthesiaDepthSuggestInputV14 = { surgeryType: "心脏搭桥手术", patientAge: 60 };
    const result = suggestAnesthesiaDepthByAi(input);
    expect(result.bisTarget).toBe(35);
    expect(result.monitoringAdvice).toBe("常规监测即可");
  });
});

describe("suggestAnesthesiaDepthByAi 老年患者", () => {
  // 手算：{surgeryType='胆囊切除术', patientAge=75}
  // 手算：bisTarget = includes('心脏')=false；75>=70=true → 45
  // 手算：monitoringAdvice = 75>=70=true → '老年患者建议每15分钟记录一次BIS值'
  it("{surgeryType='胆囊切除术', patientAge=75} → bisTarget=45, monitoringAdvice='老年患者建议每15分钟记录一次BIS值'", () => {
    const input: AiAnesthesiaDepthSuggestInputV14 = { surgeryType: "胆囊切除术", patientAge: 75 };
    const result = suggestAnesthesiaDepthByAi(input);
    expect(result.bisTarget).toBe(45);
    expect(result.monitoringAdvice).toBe("老年患者建议每15分钟记录一次BIS值");
  });
});

describe("buildAiAnesthesiaDepthSuggestReport 构建麻醉深度监测建议报告", () => {
  // 手算：{bisTarget=35, monitoringAdvice='常规监测即可'}
  // 手算：透传 bisTarget + monitoringAdvice
  it("{bisTarget=35, monitoringAdvice='常规监测即可'} → 正确返回（透传）", () => {
    const report = buildAiAnesthesiaDepthSuggestReport({ bisTarget: 35, monitoringAdvice: "常规监测即可" });
    expect(report.bisTarget).toBe(35);
    expect(report.monitoringAdvice).toBe("常规监测即可");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-anesthesia-depth-suggest auth:true", () => {
    const def = (emrAiAnesthesiaDepthSuggestV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-anesthesia-depth-suggest");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
