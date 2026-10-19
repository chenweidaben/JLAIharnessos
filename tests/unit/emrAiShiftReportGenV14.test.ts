/**
 * 健澜科技 jlmedaios - 病历AI病区交班报告生成 V14 单测（M557-D，M557 收官）
 *
 * 测试 buildAiShiftReportGen 构建 AI 病区交班报告生成、genShiftReportByAi AI 病区交班报告生成、buildAiShiftReportGenReport 构建病区交班报告生成报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiShiftReportGen,
  buildAiShiftReportGenReport,
  genShiftReportByAi,
  type AiShiftReportGenInputV14,
} from "../../src/bff/aggregators/emrAiShiftReportGenV14Aggregator";
import { emrAiShiftReportGenV14Routes } from "../../src/bff/routes/emrAiShiftReportGenV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiShiftReportGen 构建 AI 病区交班报告生成", () => {
  // 手算：recordId='RECB052', dept='护理部' → 正确构建
  it("recordId='RECB052', dept='护理部' → 正确构建", () => {
    const base = buildAiShiftReportGen("RECB052", "护理部");
    expect(base.recordId).toBe("RECB052");
    expect(base.dept).toBe("护理部");
  });
});

describe("genShiftReportByAi 有危重", () => {
  // 手算：{ward='心内科', patientCount=30, criticalCount=3}
  // 手算：report = `心内科病区今日在院30人，危重3人，病情平稳。`
  // 手算：criticalCount=3 > 0 → handoverNote='注意观察危重患者病情变化，及时记录。'
  it("{ward='心内科', patientCount=30, criticalCount=3} → report 含关键字段, handoverNote='注意观察危重患者病情变化，及时记录。'", () => {
    const input: AiShiftReportGenInputV14 = { ward: "心内科", patientCount: 30, criticalCount: 3 };
    const result = genShiftReportByAi(input);
    expect(result.report).toContain("心内科");
    expect(result.report).toContain("在院30人");
    expect(result.report).toContain("危重3人");
    expect(result.handoverNote).toBe("注意观察危重患者病情变化，及时记录。");
  });
});

describe("genShiftReportByAi 无危重", () => {
  // 手算：{ward='外科', patientCount=25, criticalCount=0}
  // 手算：report = `外科病区今日在院25人，危重0人，病情平稳。`
  // 手算：criticalCount=0 → handoverNote='今日无特殊交班事项。'
  it("{ward='外科', patientCount=25, criticalCount=0} → report 含关键字段, handoverNote='今日无特殊交班事项。'", () => {
    const input: AiShiftReportGenInputV14 = { ward: "外科", patientCount: 25, criticalCount: 0 };
    const result = genShiftReportByAi(input);
    expect(result.report).toContain("外科");
    expect(result.report).toContain("在院25人");
    expect(result.report).toContain("危重0人");
    expect(result.handoverNote).toBe("今日无特殊交班事项。");
  });
});

describe("buildAiShiftReportGenReport 构建病区交班报告生成报告", () => {
  // 手算：{report='测试报告', handoverNote='测试注意事项'}
  // 手算：透传 report + handoverNote
  it("{report='测试报告', handoverNote='测试注意事项'} → 正确返回（透传）", () => {
    const report = buildAiShiftReportGenReport({ report: "测试报告", handoverNote: "测试注意事项" });
    expect(report.report).toBe("测试报告");
    expect(report.handoverNote).toBe("测试注意事项");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-shift-report-gen auth:true", () => {
    const def = (emrAiShiftReportGenV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-shift-report-gen");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
