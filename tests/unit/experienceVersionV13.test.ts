/**
 * 健澜科技 jlmedaios - 经验更新与版本迭代 V13 单测（M296-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  compareVersionsV13,
  createNewVersionV13,
  getVersionHistoryV13,
  type ExperienceVersionV13,
} from "../../src/bff/aggregators/experienceVersionV13Aggregator";
import { experienceVersionV13Routes } from "../../src/bff/routes/experienceVersionV13";

const v1: ExperienceVersionV13 = {
  experienceId: "e-1",
  version: 1,
  title: "房颤",
  content: "初始内容",
  authorId: "zhang",
  archived: false,
};

describe("createNewVersionV13", () => {
  it("v1 → v2：version+1、content 替换、archived=false", () => {
    const v2 = createNewVersionV13(v1, "更新内容", "zhang");
    expect(v2.version).toBe(2);
    expect(v2.content).toBe("更新内容");
    expect(v2.archived).toBe(false);
    expect(v2.experienceId).toBe("e-1");
  });
});

describe("getVersionHistoryV13", () => {
  it("按 experienceId 过滤并按 version 升序", () => {
    const v2 = createNewVersionV13(v1, "更新", "zhang");
    const vOther: ExperienceVersionV13 = {
      experienceId: "e-2", version: 1, title: "其他", content: "x", authorId: "li", archived: false,
    };
    const all: ExperienceVersionV13[] = [v2, v1, vOther];
    const hist = getVersionHistoryV13("e-1", all);
    expect(hist.length).toBe(2);
    expect(hist[0].version).toBe(1);
    expect(hist[1].version).toBe(2);
  });
  it("空态→0条", () => {
    expect(getVersionHistoryV13("e-1", []).length).toBe(0);
  });
});

describe("compareVersionsV13", () => {
  it("仅 content 变化 → ['content']", () => {
    const v2 = createNewVersionV13(v1, "新内容", "zhang");
    expect(compareVersionsV13(v1, v2)).toEqual(["content"]);
  });
  it("无变化 → []", () => {
    expect(compareVersionsV13(v1, v1)).toEqual([]);
  });
});

describe("experienceVersionV13Routes 写路由", () => {
  it("POST /api/v1/experience/:id/new-version 路由存在且 auth:true", () => {
    const route = experienceVersionV13Routes.find(
      (r) => r.method === "POST" && r.path === "/api/v1/experience/:id/new-version",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
