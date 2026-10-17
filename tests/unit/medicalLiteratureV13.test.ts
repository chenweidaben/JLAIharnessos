/**
 * 健澜科技 jlmedaios - 医学文献检索 V13 单测（M327-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  countExportCitationsV13,
  countMonthlySearchesV13,
  listHotKeywordsV13,
  type LiteratureSearchV13,
} from "../../src/bff/aggregators/medicalLiteratureV13Aggregator";
import { medicalLiteratureV13Routes } from "../../src/bff/routes/medicalLiteratureV13";

const searches: LiteratureSearchV13[] = [
  { keyword: "高血压", isExported: true },
  { keyword: "高血压", isExported: true },
  { keyword: "高血压", isExported: false },
  { keyword: "糖尿病", isExported: true },
  { keyword: "糖尿病", isExported: false },
  { keyword: "冠心病", isExported: true },
  { keyword: "冠心病", isExported: false },
  { keyword: "肺炎", isExported: false },
  { keyword: "肺炎", isExported: false },
  { keyword: "肿瘤", isExported: true },
];

describe("countMonthlySearchesV13", () => {
  // 算式：10 次检索
  it("检索次数 = 10", () => {
    expect(countMonthlySearchesV13(searches)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(countMonthlySearchesV13([])).toBe(0);
  });
});

describe("countExportCitationsV13", () => {
  // 算式：5 次导出
  it("导出引用 = 5", () => {
    expect(countExportCitationsV13(searches)).toBe(5);
  });
});

describe("listHotKeywordsV13", () => {
  // 算式：高血压3 / 糖尿病2 / 冠心病2 / 肺炎2 / 肿瘤1 → Top5
  it("热点词云 = 5 个词", () => {
    const result = listHotKeywordsV13(searches);
    expect(result.length).toBe(5);
    expect(result[0].keyword).toBe("高血压");
    expect(result[0].count).toBe(3);
  });
});

describe("medicalLiteratureV13Routes 读路由", () => {
  it("GET /api/v1/medical-literature 路由存在且 auth:true", () => {
    const route = medicalLiteratureV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/medical-literature",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
