/**
 * 健澜科技 jlmedaios - 病历AI护理建议 V14 单测（M546-A）
 *
 * 测试 buildAiNursingReco 构建 AI 护理建议、recommendNursingByAi AI 护理建议、buildAiNursingRecoReport 构建护理报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiNursingReco,
  buildAiNursingRecoReport,
  recommendNursingByAi,
  type AiNursingRecoInputV14,
} from "../../src/bff/aggregators/emrAiNursingRecoV14Aggregator";
import { emrAiNursingRecoV14Routes } from "../../src/bff/routes/emrAiNursingRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiNursingReco 构建 AI 护理建议", () => {
  // 手算：recordId='RECB005', dept='心内科' → 正确构建
  it("recordId='RECB005', dept='心内科' → 正确构建", () => {
    const base = buildAiNursingReco("RECB005", "心内科");
    expect(base.recordId).toBe("RECB005");
    expect(base.dept).toBe("心内科");
  });
});

describe("recommendNursingByAi 特级", () => {
  // 手算：{diagnosis='急性心梗', age=65}
  // 手算：diagnosis.includes('心梗') → true → level='特级护理'
  // 手算：level='特级护理' → items=['心电监护','吸氧','绝对卧床']
  it("{diagnosis='急性心梗', age=65} → level='特级护理', items=['心电监护','吸氧','绝对卧床']", () => {
    const input: AiNursingRecoInputV14 = { diagnosis: "急性心梗", age: 65 };
    const result = recommendNursingByAi(input);
    expect(result.level).toBe("特级护理");
    expect(result.items).toEqual(["心电监护", "吸氧", "绝对卧床"]);
  });
});

describe("recommendNursingByAi 一级", () => {
  // 手算：{diagnosis='上感', age=40}
  // 手算：diagnosis.includes('心梗') → false；age=40<=75 → level='一级护理'
  // 手算：level='一级护理' → items=['生命体征监测','用药观察']
  it("{diagnosis='上感', age=40} → level='一级护理', items=['生命体征监测','用药观察']", () => {
    const input: AiNursingRecoInputV14 = { diagnosis: "上感", age: 40 };
    const result = recommendNursingByAi(input);
    expect(result.level).toBe("一级护理");
    expect(result.items).toEqual(["生命体征监测", "用药观察"]);
  });
});

describe("buildAiNursingRecoReport 构建护理报告", () => {
  // 手算：{level='特级护理', items=['心电监护','吸氧','绝对卧床']}
  // 手算：透传 level + items
  it("{level='特级护理', items=['心电监护','吸氧','绝对卧床']} → 正确返回（透传）", () => {
    const report = buildAiNursingRecoReport({ level: "特级护理", items: ["心电监护", "吸氧", "绝对卧床"] });
    expect(report.level).toBe("特级护理");
    expect(report.items).toEqual(["心电监护", "吸氧", "绝对卧床"]);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-nursing-reco auth:true", () => {
    const def = (emrAiNursingRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-nursing-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
