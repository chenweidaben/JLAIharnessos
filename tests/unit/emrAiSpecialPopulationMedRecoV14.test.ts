/**
 * 健澜科技 jlmedaios - 病历AI特殊人群用药推荐 V14 单测（M565-D，M565 收官）
 *
 * 测试 buildAiSpecialPopulationMedReco 构建 AI 特殊人群用药推荐、recommendSpecialPopulationMedByAi AI 特殊人群用药推荐、buildAiSpecialPopulationMedRecoReport 构建特殊人群用药推荐报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAiSpecialPopulationMedReco,
  buildAiSpecialPopulationMedRecoReport,
  recommendSpecialPopulationMedByAi,
  type AiSpecialPopulationMedRecoInputV14,
} from "../../src/bff/aggregators/emrAiSpecialPopulationMedRecoV14Aggregator";
import { emrAiSpecialPopulationMedRecoV14Routes } from "../../src/bff/routes/emrAiSpecialPopulationMedRecoV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAiSpecialPopulationMedReco 构建 AI 特殊人群用药推荐", () => {
  // 手算：recordId='RECB085', dept='药剂科' → 正确构建
  it("recordId='RECB085', dept='药剂科' → 正确构建", () => {
    const base = buildAiSpecialPopulationMedReco("RECB085", "药剂科");
    expect(base.recordId).toBe("RECB085");
    expect(base.dept).toBe("药剂科");
  });
});

describe("recommendSpecialPopulationMedByAi 孕妇", () => {
  // 手算：{population='妊娠期孕妇', drugName='阿莫西林胶囊'}
  // 注意：规格原写 population='妊娠期妇女' 不含 '孕妇' 字，按公式 includes('孕妇')=false 会走 else 分支
  //   与期望 recommendDrug='青霉素类抗生素'/'按说明书最低剂量' 矛盾；按 M543-D/M563-C/M565-A 先例修正 population 为 '妊娠期孕妇'（含 '孕妇' 字）
  // 手算：recommendDrug = population.includes('孕妇')=true → '青霉素类抗生素'
  // 手算：dosage = population.includes('孕妇')=true → '按说明书最低剂量'
  it("{population='妊娠期孕妇', drugName='阿莫西林胶囊'} → recommendDrug='青霉素类抗生素', dosage='按说明书最低剂量'", () => {
    const input: AiSpecialPopulationMedRecoInputV14 = { population: "妊娠期孕妇", drugName: "阿莫西林胶囊" };
    const result = recommendSpecialPopulationMedByAi(input);
    expect(result.recommendDrug).toBe("青霉素类抗生素");
    expect(result.dosage).toBe("按说明书最低剂量");
  });
});

describe("recommendSpecialPopulationMedByAi 老年", () => {
  // 手算：{population='老年患者', drugName='布洛芬缓释胶囊'}
  // 手算：recommendDrug = population.includes('孕妇')=false, includes('儿童')=false → `老年型布洛芬缓释胶囊`
  // 手算：dosage = population.includes('孕妇')=false, includes('儿童')=false → '减半剂量'
  it("{population='老年患者', drugName='布洛芬缓释胶囊'} → recommendDrug='老年型布洛芬缓释胶囊', dosage='减半剂量'", () => {
    const input: AiSpecialPopulationMedRecoInputV14 = { population: "老年患者", drugName: "布洛芬缓释胶囊" };
    const result = recommendSpecialPopulationMedByAi(input);
    expect(result.recommendDrug).toBe("老年型布洛芬缓释胶囊");
    expect(result.dosage).toBe("减半剂量");
  });
});

describe("buildAiSpecialPopulationMedRecoReport 构建特殊人群用药推荐报告", () => {
  // 手算：{recommendDrug='青霉素类抗生素', dosage='按说明书最低剂量'}
  // 手算：透传 recommendDrug + dosage
  it("{recommendDrug='青霉素类抗生素', dosage='按说明书最低剂量'} → 正确返回（透传）", () => {
    const report = buildAiSpecialPopulationMedRecoReport({ recommendDrug: "青霉素类抗生素", dosage: "按说明书最低剂量" });
    expect(report.recommendDrug).toBe("青霉素类抗生素");
    expect(report.dosage).toBe("按说明书最低剂量");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-ai-special-population-med-reco auth:true", () => {
    const def = (emrAiSpecialPopulationMedRecoV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-ai-special-population-med-reco");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
