/**
 * 健澜科技 jlmedaios - 病历AI手术编码推荐 V14 单测（M551-C）
 *
 * 测试 buildAiSurgeryCodeReco 构建 AI 手术编码推荐、recommendSurgeryCodeByAi AI 手术编码推荐、buildAiSurgeryCodeRecoReport 构建手术编码推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiSurgeryCodeReco,
  buildAiSurgeryCodeRecoReport,
  recommendSurgeryCodeByAi,
  type AiSurgeryCodeRecoInputV14,
} from "../../src/bff/aggregators/emrAiSurgeryCodeRecoV14Aggregator";
import { emrAiSurgeryCodeRecoV14Routes } from "../../src/bff/routes/emrAiSurgeryCodeRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiSurgeryCodeReco 构建 AI 手术编码推荐", () => {
  // 手算：recordId='RECB027', dept='心外科' → 正确构建
  it("recordId='RECB027', dept='心外科' → 正确构建", () => {
    const base = buildAiSurgeryCodeReco("RECB027", "心外科");
    expect(base.recordId).toBe("RECB027");
    expect(base.dept).toBe("心外科");
  });
});

describe("recommendSurgeryCodeByAi 搭桥", () => {
  // 手算：{surgeryName='冠状动脉搭桥术'}
  // 手算：surgeryName.includes('搭桥')=true → icd9Code='36.10'
  // 手算：icd9Code='36.10' !== '00.00' → confidence=0.90
  it("{surgeryName='冠状动脉搭桥术'} → icd9Code='36.10', confidence=0.90", () => {
    const input: AiSurgeryCodeRecoInputV14 = { surgeryName: "冠状动脉搭桥术" };
    const result = recommendSurgeryCodeByAi(input);
    expect(result.icd9Code).toBe("36.10");
    expect(result.confidence).toBe(0.90);
  });
});

describe("recommendSurgeryCodeByAi 一般", () => {
  // 手算：{surgeryName='清创缝合术'}
  // 手算：不含搭桥/支架 → icd9Code='00.00'
  // 手算：icd9Code='00.00' → confidence=0.5
  it("{surgeryName='清创缝合术'} → icd9Code='00.00', confidence=0.5", () => {
    const input: AiSurgeryCodeRecoInputV14 = { surgeryName: "清创缝合术" };
    const result = recommendSurgeryCodeByAi(input);
    expect(result.icd9Code).toBe("00.00");
    expect(result.confidence).toBe(0.5);
  });
});

describe("buildAiSurgeryCodeRecoReport 构建手术编码推荐报告", () => {
  // 手算：{icd9Code='36.10', confidence=0.90}
  // 手算：透传 icd9Code + confidence
  it("{icd9Code='36.10', confidence=0.90} → 正确返回（透传）", () => {
    const report = buildAiSurgeryCodeRecoReport({ icd9Code: "36.10", confidence: 0.90 });
    expect(report.icd9Code).toBe("36.10");
    expect(report.confidence).toBe(0.90);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-surgery-code-reco auth:true", () => {
    const def = (emrAiSurgeryCodeRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-surgery-code-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
