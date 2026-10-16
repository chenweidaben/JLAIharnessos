/**
 * 健澜科技 jlmedaios - 多院区一体化运行 V5 单测（M273-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assignCampusV5,
  buildMultiCampusV5Report,
  compareCampusV5,
} from "../../src/bff/aggregators/multiCampusV5ReportAggregator";

describe("assignCampusV5", () => {
  it("急诊→本部院区", () => {
    expect(assignCampusV5("张三", "急诊", "分院").campus).toBe("本部院区");
  });
});

describe("compareCampusV5", () => {
  it("2院区成本最低者为best", () => {
    const r = compareCampusV5([{ name: "本部", opd: 1000, inpatient: 200, cost: 500 }, { name: "分院", opd: 800, inpatient: 150, cost: 300 }]);
    expect(r.best).toBe("分院");
  });
});

describe("buildMultiCampusV5Report", () => {
  it("生成院区数据", () => {
    expect(buildMultiCampusV5Report("30d").campus.bed).toBeGreaterThan(0);
  });
  it("生成统一门户数据", () => {
    expect(buildMultiCampusV5Report("30d").portal.sso).toBeGreaterThan(0);
  });
  it("生成建议", () => {
    expect(buildMultiCampusV5Report("30d").suggestions.length).toBeGreaterThan(0);
  });
});
