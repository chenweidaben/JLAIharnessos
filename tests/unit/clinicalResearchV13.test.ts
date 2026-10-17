/**
 * 健澜科技 jlmedaios - 临床研究项目 V13 单测（M327-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  checkGcpComplianceV13,
  countActiveProjectsV13,
  countPublishedPapersV13,
  sumProjectFundingV13,
  type ResearchProjectV13,
} from "../../src/bff/aggregators/clinicalResearchV13Aggregator";
import { clinicalResearchV13Routes } from "../../src/bff/routes/clinicalResearchV13";

const projects: ResearchProjectV13[] = [
  { projectName: "项目A", funding: 100, publishedPapers: 1, gcpPassed: true },
  { projectName: "项目B", funding: 200, publishedPapers: 1, gcpPassed: true },
  { projectName: "项目C", funding: 300, publishedPapers: 1, gcpPassed: true },
];

describe("countActiveProjectsV13", () => {
  // 算式：3 个项目
  it("在研项目 = 3", () => {
    expect(countActiveProjectsV13(projects)).toBe(3);
  });
  it("空态 → 0", () => {
    expect(countActiveProjectsV13([])).toBe(0);
  });
});

describe("sumProjectFundingV13", () => {
  // 算式：100+200+300 = 600
  it("经费总额 = 600 万", () => {
    expect(sumProjectFundingV13(projects)).toBe(600);
  });
});

describe("countPublishedPapersV13", () => {
  // 算式：1+1+1 = 3
  it("论文数 = 3", () => {
    expect(countPublishedPapersV13(projects)).toBe(3);
  });
});

describe("checkGcpComplianceV13", () => {
  // 算式：全部通过
  it("GCP 合规 = true", () => {
    expect(checkGcpComplianceV13(projects)).toBe(true);
  });
});

describe("clinicalResearchV13Routes 读路由", () => {
  it("GET /api/v1/clinical-research-overview 路由存在且 auth:true", () => {
    const route = clinicalResearchV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/clinical-research-overview",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
