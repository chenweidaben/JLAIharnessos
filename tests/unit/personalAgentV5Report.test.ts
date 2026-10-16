/**
 * 健澜科技 jlmedaios - Personal Agent 2.0 V5 纯函数单测（M257-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAgentTaskV5,
  buildPersonalAgentV5Report,
  learnFromExperienceV5,
} from "../../src/bff/aggregators/personalAgentV5ReportAggregator";

describe("buildAgentTaskV5", () => {
  it("DoctorMUSE高优先级 → 主动鉴别诊断", () => {
    expect(buildAgentTaskV5("DoctorMUSE", { patient: "张三", urgency: "high" }).proactive).toBe(true);
  });
});

describe("learnFromExperienceV5", () => {
  it("成功交互反馈90分 → 经验分96可继承", () => {
    expect(learnFromExperienceV5({ type: "诊断" }, { success: true, feedback: 90 }).successorCanUse).toBe(true);
  });
});

describe("buildPersonalAgentV5Report", () => {
  it("生成Doctor MUSE数据", () => {
    const r = buildPersonalAgentV5Report("30d");
    expect(r.doctorMUSE.orderRecommend).toBeGreaterThan(0);
  });

  it("生成Patient MUSE数据", () => {
    const r = buildPersonalAgentV5Report("30d");
    expect(r.patientMUSE.booking).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildPersonalAgentV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
