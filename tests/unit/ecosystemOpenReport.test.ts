/**
 * 健澜科技 jlmedaios - 生态开放 纯函数单测（M234-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  authenticateAPI,
  buildEcosystemOpenReport,
  routeAPIRequest,
} from "../../src/bff/aggregators/ecosystemOpenReportAggregator";

describe("authenticateAPI", () => {
  it("Bearer token → 认证通过", () => {
    expect(authenticateAPI("Bearer abc123").authenticated).toBe(true);
  });
});

describe("routeAPIRequest", () => {
  it("graphql请求 → 路由到/graphql", () => {
    expect(routeAPIRequest("graphql query").endpoint).toBe("/graphql");
  });
});

describe("buildEcosystemOpenReport", () => {
  it("生成API数据", () => {
    const r = buildEcosystemOpenReport("30d");
    expect(r.api.rest).toBeGreaterThan(0);
  });

  it("生成第三方数据", () => {
    const r = buildEcosystemOpenReport("30d");
    expect(r.thirdParty.pharmacy).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildEcosystemOpenReport("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
