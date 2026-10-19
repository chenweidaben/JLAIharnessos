/**
 * 健澜科技 jlmedaios - 病历AI术后镇痛方案推荐 V14 单测（M562-D，M562 收官）
 *
 * 测试 buildAiPostopAnalgesiaReco 构建 AI 术后镇痛方案推荐、recommendPostopAnalgesiaByAi AI 术后镇痛方案推荐、buildAiPostopAnalgesiaRecoReport 构建术后镇痛方案推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiPostopAnalgesiaReco,
  buildAiPostopAnalgesiaRecoReport,
  recommendPostopAnalgesiaByAi,
  type AiPostopAnalgesiaRecoInputV14,
} from "../../src/bff/aggregators/emrAiPostopAnalgesiaRecoV14Aggregator";
import { emrAiPostopAnalgesiaRecoV14Routes } from "../../src/bff/routes/emrAiPostopAnalgesiaRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiPostopAnalgesiaReco 构建 AI 术后镇痛方案推荐", () => {
  // 手算：recordId='RECB073', dept='外科' → 正确构建
  it("recordId='RECB073', dept='外科' → 正确构建", () => {
    const base = buildAiPostopAnalgesiaReco("RECB073", "外科");
    expect(base.recordId).toBe("RECB073");
    expect(base.dept).toBe("外科");
  });
});

describe("recommendPostopAnalgesiaByAi 心脏手术", () => {
  // 手算：{surgeryType='心脏搭桥手术', painScore=5}
  // 手算：planName = '心脏搭桥手术'.includes('心脏')=true → '静脉镇痛泵'
  // 手算：dosage = planName.includes('静脉')=true → '根据体重调整'
  it("{surgeryType='心脏搭桥手术', painScore=5} → planName='静脉镇痛泵', dosage='根据体重调整'", () => {
    const input: AiPostopAnalgesiaRecoInputV14 = { surgeryType: "心脏搭桥手术", painScore: 5 };
    const result = recommendPostopAnalgesiaByAi(input);
    expect(result.planName).toBe("静脉镇痛泵");
    expect(result.dosage).toBe("根据体重调整");
  });
});

describe("recommendPostopAnalgesiaByAi 高疼痛", () => {
  // 手算：{surgeryType='胆囊切除术', painScore=8}
  // 手算：planName = includes('心脏')=false；8>=7=true → '口服止痛药+静脉镇痛'
  // 手算：dosage = planName.includes('静脉')=true → '根据体重调整'
  it("{surgeryType='胆囊切除术', painScore=8} → planName='口服止痛药+静脉镇痛', dosage='根据体重调整'", () => {
    const input: AiPostopAnalgesiaRecoInputV14 = { surgeryType: "胆囊切除术", painScore: 8 };
    const result = recommendPostopAnalgesiaByAi(input);
    expect(result.planName).toBe("口服止痛药+静脉镇痛");
    expect(result.dosage).toBe("根据体重调整");
  });
});

describe("buildAiPostopAnalgesiaRecoReport 构建术后镇痛方案推荐报告", () => {
  // 手算：{planName='静脉镇痛泵', dosage='根据体重调整'}
  // 手算：透传 planName + dosage
  it("{planName='静脉镇痛泵', dosage='根据体重调整'} → 正确返回（透传）", () => {
    const report = buildAiPostopAnalgesiaRecoReport({ planName: "静脉镇痛泵", dosage: "根据体重调整" });
    expect(report.planName).toBe("静脉镇痛泵");
    expect(report.dosage).toBe("根据体重调整");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-postop-analgesia-reco auth:true", () => {
    const def = (emrAiPostopAnalgesiaRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-postop-analgesia-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
