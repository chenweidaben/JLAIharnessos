/**
 * 健澜科技 jlmedaios - 病历AI急诊留观病历生成 V14 单测（M560-C）
 *
 * 测试 buildAiEmergencyObsNoteGen 构建 AI 急诊留观病历生成、genEmergencyObsNoteByAi AI 急诊留观病历生成、buildAiEmergencyObsNoteGenReport 构建急诊留观病历生成报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiEmergencyObsNoteGen,
  buildAiEmergencyObsNoteGenReport,
  genEmergencyObsNoteByAi,
  type AiEmergencyObsNoteGenInputV14,
} from "../../src/bff/aggregators/emrAiEmergencyObsNoteGenV14Aggregator";
import { emrAiEmergencyObsNoteGenV14Routes } from "../../src/bff/routes/emrAiEmergencyObsNoteGenV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiEmergencyObsNoteGen 构建 AI 急诊留观病历生成", () => {
  // 手算：recordId='RECB064', dept='急诊科' → 正确构建
  it("recordId='RECB064', dept='急诊科' → 正确构建", () => {
    const base = buildAiEmergencyObsNoteGen("RECB064", "急诊科");
    expect(base.recordId).toBe("RECB064");
    expect(base.dept).toBe("急诊科");
  });
});

describe("genEmergencyObsNoteByAi 王五", () => {
  // 手算：{patientName='王五', observationHours=6, condition='生命体征平稳'}
  // 手算：note = '王五留观6小时，当前病情：生命体征平稳，继续观察。'（模板字符串拼接）
  // 手算：doctor = 'AI急诊助手'（固定）
  it("{patientName='王五', observationHours=6, condition='生命体征平稳'} → note 含王五/留观6小时/生命体征平稳, doctor='AI急诊助手'", () => {
    const input: AiEmergencyObsNoteGenInputV14 = { patientName: "王五", observationHours: 6, condition: "生命体征平稳" };
    const result = genEmergencyObsNoteByAi(input);
    expect(result.note).toContain("王五");
    expect(result.note).toContain("留观6小时");
    expect(result.note).toContain("生命体征平稳");
    expect(result.doctor).toBe("AI急诊助手");
  });
});

describe("genEmergencyObsNoteByAi 赵六", () => {
  // 手算：{patientName='赵六', observationHours=12, condition='仍有胸痛'}
  // 手算：note = '赵六留观12小时，当前病情：仍有胸痛，继续观察。'（模板字符串拼接，不同患者）
  // 手算：doctor = 'AI急诊助手'（固定）
  it("{patientName='赵六', observationHours=12, condition='仍有胸痛'} → note 含赵六/留观12小时/仍有胸痛, doctor='AI急诊助手'", () => {
    const input: AiEmergencyObsNoteGenInputV14 = { patientName: "赵六", observationHours: 12, condition: "仍有胸痛" };
    const result = genEmergencyObsNoteByAi(input);
    expect(result.note).toContain("赵六");
    expect(result.note).toContain("留观12小时");
    expect(result.note).toContain("仍有胸痛");
    expect(result.doctor).toBe("AI急诊助手");
  });
});

describe("buildAiEmergencyObsNoteGenReport 构建急诊留观病历生成报告", () => {
  // 手算：{note='测试记录', doctor='AI急诊助手'}
  // 手算：透传 note + doctor
  it("{note='测试记录', doctor='AI急诊助手'} → 正确返回（透传）", () => {
    const report = buildAiEmergencyObsNoteGenReport({ note: "测试记录", doctor: "AI急诊助手" });
    expect(report.note).toBe("测试记录");
    expect(report.doctor).toBe("AI急诊助手");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-emergency-obs-note-gen auth:true", () => {
    const def = (emrAiEmergencyObsNoteGenV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-emergency-obs-note-gen");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
