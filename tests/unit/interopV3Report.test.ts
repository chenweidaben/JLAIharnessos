/**
 * 健澜科技 jlmedaios - 互联互通 V3 纯函数单测（M231-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessInteropLevel,
  buildInteropV3Report,
  mapDataStandard,
} from "../../src/bff/aggregators/interopV3ReportAggregator";

describe("assessInteropLevel", () => {
  it("90项 → 五级", () => {
    expect(assessInteropLevel(90).level).toBe("五级");
  });

  it("75项 → 四级甲", () => {
    expect(assessInteropLevel(75).level).toBe("四级甲");
  });
});

describe("mapDataStandard", () => {
  it("本地编码ICD → 映射成功", () => {
    expect(mapDataStandard("ICD-E11", "ICD-10").mapped).toBe(true);
  });
});

describe("buildInteropV3Report", () => {
  it("生成成熟度数据", () => {
    const r = buildInteropV3Report("30d");
    expect(r.maturity.level).toBeTruthy();
  });

  it("生成标准数据", () => {
    const r = buildInteropV3Report("30d");
    expect(r.standards.ws363).toBe(true);
  });

  it("生成平台数据", () => {
    const r = buildInteropV3Report("30d");
    expect(r.platform.esb).toBe(true);
  });

  it("生成建议", () => {
    const r = buildInteropV3Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
