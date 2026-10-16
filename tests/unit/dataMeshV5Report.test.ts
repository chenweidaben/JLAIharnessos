/**
 * 健澜科技 jlmedaios - 数据 Mesh 与数据产品化 V5 纯函数单测（M260-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDataMeshV5Report,
  defineDataProductV5,
  negotiateDataContractV5,
} from "../../src/bff/aggregators/dataMeshV5ReportAggregator";

describe("defineDataProductV5", () => {
  it("临床域+患者实体 → 产品ID clinical-patient", () => {
    expect(defineDataProductV5("clinical", "patient").productId).toBe("clinical-patient");
  });
});

describe("negotiateDataContractV5", () => {
  it("消费方需要质量+SLA，提供方支持 → 契约达成", () => {
    expect(negotiateDataContractV5({ requirements: ["质量", "SLA"] }, { capabilities: ["质量", "SLA", "安全"] }).contract).toBe(true);
  });
});

describe("buildDataMeshV5Report", () => {
  it("生成数据域数据", () => {
    const r = buildDataMeshV5Report("30d");
    expect(r.domain.clinical).toBeGreaterThan(0);
  });

  it("生成产品数据", () => {
    const r = buildDataMeshV5Report("30d");
    expect(r.product.dataset).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildDataMeshV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
