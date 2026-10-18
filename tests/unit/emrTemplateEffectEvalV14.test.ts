/**
 * 健澜科技 jlmedaios - 模板效果评估 V14 单测（M525-D，M525 收官）
 *
 * 测试 buildEffectEval 构建评估、evaluateTemplateEffect 效果评估、buildEffectEvalReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildEffectEval,
  buildEffectEvalReport,
  evaluateTemplateEffect,
  type EffectEvalInputV14,
} from "../../src/bff/aggregators/emrTemplateEffectEvalV14Aggregator";
import { emrTemplateEffectEvalV14Routes } from "../../src/bff/routes/emrTemplateEffectEvalV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildEffectEval 构建评估", () => {
  // 手算：templateName='入院记录模板v3.0', evalPeriod='2026-Q3' → 正确构建
  it("templateName='入院记录模板v3.0', evalPeriod='2026-Q3' → 正确构建", () => {
    const evalData = buildEffectEval("入院记录模板v3.0", "2026-Q3");
    expect(evalData.templateName).toBe("入院记录模板v3.0");
    expect(evalData.evalPeriod).toBe("2026-Q3");
  });
});

describe("evaluateTemplateEffect 卓越", () => {
  // 手算：{completionRate:95, satisfactionRate:92, defectReduction:90}
  // 手算：(95+92+90)/3 = 277/3 = 92.333... → 92.333*10 = 923.333 → Math.round(923.333)/10 = 923/10 = 92.3
  // 手算：92.3 >= 90 → grade='卓越'
  it("{completionRate:95, satisfactionRate:92, defectReduction:90} → effectScore=92.3, grade='卓越'", () => {
    const input: EffectEvalInputV14 = { completionRate: 95, satisfactionRate: 92, defectReduction: 90 };
    const result = evaluateTemplateEffect(input);
    expect(result.effectScore).toBeCloseTo(92.3, 1);
    expect(result.grade).toBe("卓越");
  });
});

describe("evaluateTemplateEffect 良好", () => {
  // 手算：{completionRate:80, satisfactionRate:75, defectReduction:70}
  // 手算：(80+75+70)/3 = 225/3 = 75.0 → 75.0*10 = 750 → Math.round(750)/10 = 750/10 = 75.0
  // 手算：75.0 >= 75 → grade='良好'
  it("{completionRate:80, satisfactionRate:75, defectReduction:70} → effectScore=75.0, grade='良好'", () => {
    const input: EffectEvalInputV14 = { completionRate: 80, satisfactionRate: 75, defectReduction: 70 };
    const result = evaluateTemplateEffect(input);
    expect(result.effectScore).toBeCloseTo(75.0, 1);
    expect(result.grade).toBe("良好");
  });
});

describe("buildEffectEvalReport 构建报告", () => {
  // 手算：{effectScore:92.3, grade:'卓越'}
  // 手算：透传 effectScore + grade
  it("{effectScore:92.3, grade:'卓越'} → 正确返回（透传）", () => {
    const report = buildEffectEvalReport({ effectScore: 92.3, grade: "卓越" });
    expect(report.effectScore).toBeCloseTo(92.3, 1);
    expect(report.grade).toBe("卓越");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-template-effect-eval auth:true", () => {
    const def = (emrTemplateEffectEvalV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-template-effect-eval");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
