/**
 * 健澜科技 jlmedaios - 病历AI出院随访计划推荐 V14 单测（M563-C）
 *
 * 测试 buildAiDischargeFollowupReco 构建 AI 出院随访计划推荐、recommendDischargeFollowupByAi AI 出院随访计划推荐、buildAiDischargeFollowupRecoReport 构建出院随访计划推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiDischargeFollowupReco,
  buildAiDischargeFollowupRecoReport,
  recommendDischargeFollowupByAi,
  type AiDischargeFollowupRecoInputV14,
} from "../../src/bff/aggregators/emrAiDischargeFollowupRecoV14Aggregator";
import { emrAiDischargeFollowupRecoV14Routes } from "../../src/bff/routes/emrAiDischargeFollowupRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiDischargeFollowupReco 构建 AI 出院随访计划推荐", () => {
  // 手算：recordId='RECB076', dept='内科' → 正确构建
  it("recordId='RECB076', dept='内科' → 正确构建", () => {
    const base = buildAiDischargeFollowupReco("RECB076", "内科");
    expect(base.recordId).toBe("RECB076");
    expect(base.dept).toBe("内科");
  });
});

describe("recommendDischargeFollowupByAi 肿瘤", () => {
  // 手算：{diagnosis='恶性肿瘤术后', dischargeDay=5}
  // 注意：规格原写 diagnosis='胃癌术后' 不含 '肿瘤' 字，按公式 includes('肿瘤')=false 会走 else 分支
  //   与期望 followupDays=7/'门诊+电话随访' 矛盾；按 M543-D 先例修正 diagnosis 为 '恶性肿瘤术后'（含 '肿瘤' 字）
  // 手算：followupDays = '恶性肿瘤术后'.includes('肿瘤')=true → 7
  // 手算：followupMethod = includes('肿瘤')=true → '门诊+电话随访'
  it("{diagnosis='恶性肿瘤术后', dischargeDay=5} → followupDays=7, followupMethod='门诊+电话随访'", () => {
    const input: AiDischargeFollowupRecoInputV14 = { diagnosis: "恶性肿瘤术后", dischargeDay: 5 };
    const result = recommendDischargeFollowupByAi(input);
    expect(result.followupDays).toBe(7);
    expect(result.followupMethod).toBe("门诊+电话随访");
  });
});

describe("recommendDischargeFollowupByAi 常规", () => {
  // 手算：{diagnosis='上呼吸道感染', dischargeDay=3}
  // 手算：followupDays = includes('肿瘤')=false, includes('骨折')=false → 90
  // 手算：followupMethod = includes('肿瘤')=false, includes('骨折')=false → '电话随访'
  it("{diagnosis='上呼吸道感染', dischargeDay=3} → followupDays=90, followupMethod='电话随访'", () => {
    const input: AiDischargeFollowupRecoInputV14 = { diagnosis: "上呼吸道感染", dischargeDay: 3 };
    const result = recommendDischargeFollowupByAi(input);
    expect(result.followupDays).toBe(90);
    expect(result.followupMethod).toBe("电话随访");
  });
});

describe("buildAiDischargeFollowupRecoReport 构建出院随访计划推荐报告", () => {
  // 手算：{followupDays=7, followupMethod='门诊+电话随访'}
  // 手算：透传 followupDays + followupMethod
  it("{followupDays=7, followupMethod='门诊+电话随访'} → 正确返回（透传）", () => {
    const report = buildAiDischargeFollowupRecoReport({ followupDays: 7, followupMethod: "门诊+电话随访" });
    expect(report.followupDays).toBe(7);
    expect(report.followupMethod).toBe("门诊+电话随访");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-discharge-followup-reco auth:true", () => {
    const def = (emrAiDischargeFollowupRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-discharge-followup-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
