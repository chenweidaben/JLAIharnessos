/**
 * 健澜科技 jlmedaios - 病历AI急诊分诊分级推荐 V14 单测（M560-A）
 *
 * 测试 buildAiEmergencyTriageReco 构建 AI 急诊分诊分级推荐、recommendEmergencyTriageByAi AI 急诊分诊分级推荐、buildAiEmergencyTriageRecoReport 构建急诊分诊分级推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiEmergencyTriageReco,
  buildAiEmergencyTriageRecoReport,
  recommendEmergencyTriageByAi,
  type AiEmergencyTriageRecoInputV14,
} from "../../src/bff/aggregators/emrAiEmergencyTriageRecoV14Aggregator";
import { emrAiEmergencyTriageRecoV14Routes } from "../../src/bff/routes/emrAiEmergencyTriageRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiEmergencyTriageReco 构建 AI 急诊分诊分级推荐", () => {
  // 手算：recordId='RECB062', dept='急诊科' → 正确构建
  it("recordId='RECB062', dept='急诊科' → 正确构建", () => {
    const base = buildAiEmergencyTriageReco("RECB062", "急诊科");
    expect(base.recordId).toBe("RECB062");
    expect(base.dept).toBe("急诊科");
  });
});

describe("recommendEmergencyTriageByAi 一级", () => {
  // 手算：{symptom='胸痛伴呼吸困难', vitalAbnormal=true}
  // 手算：level = ('胸痛伴呼吸困难'.includes('胸痛')=true || true) = true → '一级（濒危）'
  // 手算：waitTime = level.includes('一级') ? 0 = 0
  it("{symptom='胸痛伴呼吸困难', vitalAbnormal=true} → level='一级（濒危）', waitTime=0", () => {
    const input: AiEmergencyTriageRecoInputV14 = { symptom: "胸痛伴呼吸困难", vitalAbnormal: true };
    const result = recommendEmergencyTriageByAi(input);
    expect(result.level).toBe("一级（濒危）");
    expect(result.waitTime).toBe(0);
  });
});

describe("recommendEmergencyTriageByAi 三级", () => {
  // 手算：{symptom='轻微头痛', vitalAbnormal=false}
  // 手算：level = ('轻微头痛'.includes('胸痛')=false || false) = false；
  //   '轻微头痛'.includes('腹痛')=false → '三级（急症）'
  // 手算：waitTime = level.includes('一级')=false, '二级'=false → 30
  it("{symptom='轻微头痛', vitalAbnormal=false} → level='三级（急症）', waitTime=30", () => {
    const input: AiEmergencyTriageRecoInputV14 = { symptom: "轻微头痛", vitalAbnormal: false };
    const result = recommendEmergencyTriageByAi(input);
    expect(result.level).toBe("三级（急症）");
    expect(result.waitTime).toBe(30);
  });
});

describe("buildAiEmergencyTriageRecoReport 构建急诊分诊分级推荐报告", () => {
  // 手算：{level='一级（濒危）', waitTime=0}
  // 手算：透传 level + waitTime
  it("{level='一级（濒危）', waitTime=0} → 正确返回（透传）", () => {
    const report = buildAiEmergencyTriageRecoReport({ level: "一级（濒危）", waitTime: 0 });
    expect(report.level).toBe("一级（濒危）");
    expect(report.waitTime).toBe(0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-emergency-triage-reco auth:true", () => {
    const def = (emrAiEmergencyTriageRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-emergency-triage-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
