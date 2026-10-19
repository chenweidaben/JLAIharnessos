/**
 * 健澜科技 jlmedaios - 病历AI用药咨询答复 V14 单测（M565-B）
 *
 * 测试 buildAiMedicationConsultReply 构建 AI 用药咨询答复、replyMedicationConsultByAi AI 用药咨询答复、buildAiMedicationConsultReplyReport 构建用药咨询答复报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiMedicationConsultReply,
  buildAiMedicationConsultReplyReport,
  replyMedicationConsultByAi,
  type AiMedicationConsultReplyInputV14,
} from "../../src/bff/aggregators/emrAiMedicationConsultReplyV14Aggregator";
import { emrAiMedicationConsultReplyV14Routes } from "../../src/bff/routes/emrAiMedicationConsultReplyV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiMedicationConsultReply 构建 AI 用药咨询答复", () => {
  // 手算：recordId='RECB083', dept='药剂科' → 正确构建
  it("recordId='RECB083', dept='药剂科' → 正确构建", () => {
    const base = buildAiMedicationConsultReply("RECB083", "药剂科");
    expect(base.recordId).toBe("RECB083");
    expect(base.dept).toBe("药剂科");
  });
});

describe("replyMedicationConsultByAi 饭前咨询", () => {
  // 手算：{question='这个药需要饭前吃吗？', drugName='奥美拉唑肠溶胶囊'}
  // 手算：reply = question.includes('饭前')=true → '奥美拉唑肠溶胶囊建议饭前30分钟服用'
  // 手算：warning = question.includes('副作用')=false → '无特殊警告'
  it("{question='这个药需要饭前吃吗？', drugName='奥美拉唑肠溶胶囊'} → reply='奥美拉唑肠溶胶囊建议饭前30分钟服用', warning='无特殊警告'", () => {
    const input: AiMedicationConsultReplyInputV14 = { question: "这个药需要饭前吃吗？", drugName: "奥美拉唑肠溶胶囊" };
    const result = replyMedicationConsultByAi(input);
    expect(result.reply).toBe("奥美拉唑肠溶胶囊建议饭前30分钟服用");
    expect(result.warning).toBe("无特殊警告");
  });
});

describe("replyMedicationConsultByAi 副作用咨询", () => {
  // 手算：{question='这个药有什么副作用？', drugName='布洛芬缓释胶囊'}
  // 手算：reply = question.includes('饭前')=false, includes('饭后')=false → '布洛芬缓释胶囊按医嘱服用即可'
  // 手算：warning = question.includes('副作用')=true → '如有不适请及时就医'
  it("{question='这个药有什么副作用？', drugName='布洛芬缓释胶囊'} → reply 含'布洛芬缓释胶囊'和'按医嘱服用即可', warning='如有不适请及时就医'", () => {
    const input: AiMedicationConsultReplyInputV14 = { question: "这个药有什么副作用？", drugName: "布洛芬缓释胶囊" };
    const result = replyMedicationConsultByAi(input);
    expect(result.reply).toContain("布洛芬缓释胶囊");
    expect(result.reply).toContain("按医嘱服用即可");
    expect(result.warning).toBe("如有不适请及时就医");
  });
});

describe("buildAiMedicationConsultReplyReport 构建用药咨询答复报告", () => {
  // 手算：{reply='测试答复', warning='测试警告'}
  // 手算：透传 reply + warning
  it("{reply='测试答复', warning='测试警告'} → 正确返回（透传）", () => {
    const report = buildAiMedicationConsultReplyReport({ reply: "测试答复", warning: "测试警告" });
    expect(report.reply).toBe("测试答复");
    expect(report.warning).toBe("测试警告");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-medication-consult-reply auth:true", () => {
    const def = (emrAiMedicationConsultReplyV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-medication-consult-reply");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
