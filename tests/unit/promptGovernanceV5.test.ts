/**
 * 健澜科技 jlmedaios - Prompt 工程与模板治理 V5 单测（M280-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPromptGovernanceV5Report,
  evalPromptV5,
  renderPromptV5,
  versionPromptV5,
  type PromptTemplate,
} from "../../src/bff/aggregators/promptGovernanceV5Aggregator";

const tpl: PromptTemplate = {
  id: "tpl-1",
  name: "出院小结",
  version: "1.2.0",
  systemPrompt: "你是主治医生",
  userTemplate: "患者{{name}}诊断{{diagnosis}}请生成小结",
  variables: ["name", "diagnosis"],
  status: "active",
};

describe("renderPromptV5", () => {
  it("替换{{name}}{{diagnosis}}占位符", () => {
    const out = renderPromptV5(tpl, { name: "张三", diagnosis: "肺炎" });
    expect(out).toBe("患者张三诊断肺炎请生成小结");
  });
});

describe("versionPromptV5", () => {
  it("1.2.0 minor+1→1.3.0", () => {
    expect(versionPromptV5("1.2.0", "优化few-shot").newVersion).toBe("1.3.0");
  });
});

describe("evalPromptV5", () => {
  it("accuracy=90/completeness=80/safety=100→综合89", () => {
    // 90*0.5 + 80*0.3 + 100*0.2 = 45+24+20 = 89
    expect(evalPromptV5("输出内容", { accuracy: 90, completeness: 80, safety: 100 }).score).toBe(89);
  });
  it("评分<80→未通过", () => {
    const r = evalPromptV5("输出", { accuracy: 60, completeness: 60, safety: 80 });
    // 60*0.5+60*0.3+80*0.2=30+18+16=64
    expect(r.passed).toBe(false);
  });
});

describe("buildPromptGovernanceV5Report", () => {
  it("统计active模板与平均评测分", () => {
    const templates: PromptTemplate[] = [
      tpl,
      { ...tpl, id: "tpl-2", status: "draft" },
    ];
    const r = buildPromptGovernanceV5Report(templates, [88, 92]);
    expect(r.activeCount).toBe(1);
    expect(r.draftCount).toBe(1);
    expect(r.avgEvalScore).toBe(90);
  });
});
