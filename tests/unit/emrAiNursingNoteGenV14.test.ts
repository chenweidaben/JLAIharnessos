/**
 * 健澜科技 jlmedaios - 病历AI护理记录生成 V14 单测（M557-A）
 *
 * 测试 buildAiNursingNoteGen 构建 AI 护理记录生成、genNursingNoteByAi AI 护理记录生成、buildAiNursingNoteGenReport 构建护理记录生成报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiNursingNoteGen,
  buildAiNursingNoteGenReport,
  genNursingNoteByAi,
  type AiNursingNoteGenInputV14,
} from "../../src/bff/aggregators/emrAiNursingNoteGenV14Aggregator";
import { emrAiNursingNoteGenV14Routes } from "../../src/bff/routes/emrAiNursingNoteGenV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiNursingNoteGen 构建 AI 护理记录生成", () => {
  // 手算：recordId='RECB049', dept='护理部' → 正确构建
  it("recordId='RECB049', dept='护理部' → 正确构建", () => {
    const base = buildAiNursingNoteGen("RECB049", "护理部");
    expect(base.recordId).toBe("RECB049");
    expect(base.dept).toBe("护理部");
  });
});

describe("genNursingNoteByAi 张三", () => {
  // 手算：{patientName='张三', ward='心内科', vitalSigns='T36.5℃ P78次/分 R18次/分 BP120/80mmHg'}
  // 手算：note = `张三在心内科病区，生命体征：T36.5℃ P78次/分 R18次/分 BP120/80mmHg，病情平稳。`
  // 手算：recorder = 'AI护理助手'
  it("{patientName='张三', ward='心内科', vitalSigns='T36.5℃ P78次/分 R18次/分 BP120/80mmHg'} → note 含关键字段, recorder='AI护理助手'", () => {
    const input: AiNursingNoteGenInputV14 = {
      patientName: "张三",
      ward: "心内科",
      vitalSigns: "T36.5℃ P78次/分 R18次/分 BP120/80mmHg",
    };
    const result = genNursingNoteByAi(input);
    expect(result.note).toContain("张三");
    expect(result.note).toContain("心内科");
    expect(result.note).toContain("T36.5℃");
    expect(result.recorder).toBe("AI护理助手");
  });
});

describe("genNursingNoteByAi 李四", () => {
  // 手算：{patientName='李四', ward='外科', vitalSigns='T37.0℃ P80次/分'}
  // 手算：note = `李四在外科病区，生命体征：T37.0℃ P80次/分，病情平稳。`
  // 手算：recorder = 'AI护理助手'
  it("{patientName='李四', ward='外科', vitalSigns='T37.0℃ P80次/分'} → note 含关键字段, recorder='AI护理助手'", () => {
    const input: AiNursingNoteGenInputV14 = {
      patientName: "李四",
      ward: "外科",
      vitalSigns: "T37.0℃ P80次/分",
    };
    const result = genNursingNoteByAi(input);
    expect(result.note).toContain("李四");
    expect(result.note).toContain("外科");
    expect(result.recorder).toBe("AI护理助手");
  });
});

describe("buildAiNursingNoteGenReport 构建护理记录生成报告", () => {
  // 手算：{note='测试记录', recorder='AI护理助手'}
  // 手算：透传 note + recorder
  it("{note='测试记录', recorder='AI护理助手'} → 正确返回（透传）", () => {
    const report = buildAiNursingNoteGenReport({ note: "测试记录", recorder: "AI护理助手" });
    expect(report.note).toBe("测试记录");
    expect(report.recorder).toBe("AI护理助手");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-nursing-note-gen auth:true", () => {
    const def = (emrAiNursingNoteGenV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-nursing-note-gen");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
