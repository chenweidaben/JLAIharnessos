/**
 * 健澜科技 jlmedaios - MUSE 跨角色任务流转 V5 单测（M284-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMuseHandoffV5Report,
  closeHandoffV5,
  createHandoffV5,
  routeHandoffV5,
} from "../../src/bff/aggregators/museHandoffV5Aggregator";
import { museHandoffV5Routes } from "../../src/bff/routes/museHandoffV5";

describe("createHandoffV5", () => {
  it("新建交接默认pending", () => {
    const h = createHandoffV5("医生", "药师", "用药", "x", "调整");
    expect(h.status).toBe("pending");
    expect(h.fromRole).toBe("医生");
  });
});

describe("routeHandoffV5", () => {
  it("用药主题→路由药师", () => {
    const h = createHandoffV5("医生", "护士", "用药相互作用", "x", "调整");
    expect(routeHandoffV5(h).recommendedRole).toBe("药师");
  });
  it("KPI主题→路由管理者", () => {
    const h = createHandoffV5("医生", "护士", "KPI不达标", "x", "分析");
    expect(routeHandoffV5(h).recommendedRole).toBe("管理者");
  });
});

describe("closeHandoffV5", () => {
  it("闭环后status=closed", () => {
    const h = createHandoffV5("a", "b", "t", "ctx", "act");
    expect(closeHandoffV5(h, "已处理").status).toBe("closed");
  });
});

describe("buildMuseHandoffV5Report", () => {
  it("1待处理1已闭环", () => {
    const h1 = createHandoffV5("a", "b", "t", "c", "a");
    const h2 = closeHandoffV5(createHandoffV5("a", "b", "t", "c", "a"), "done");
    const r = buildMuseHandoffV5Report([h1, h2]);
    expect(r.pendingCount).toBe(1);
    expect(r.closedCount).toBe(1);
  });
});

describe("museHandoffV5Routes 写权限", () => {
  it("POST /api/v1/muse-handoff 路由存在且 auth:true", () => {
    const post = museHandoffV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/muse-handoff");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
