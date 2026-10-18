/**
 * 健澜科技 jlmedaios - 质控质量改进项目 V14 单测（M504-B）
 *
 * 测试 buildProject 构建、addProject 添加、closeProject 关闭、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  addProject,
  buildProject,
  closeProject,
  type QualityProjectV14,
} from "../../src/bff/aggregators/emrQcQualityProjectV14Aggregator";
import { emrQcQualityProjectV14Routes } from "../../src/bff/routes/emrQcQualityProjectV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildProject 降低缺陷率", () => {
  // 手算：name='降低缺陷率', owner='张主任', status='进行中' → 正确构建
  it("name='降低缺陷率', owner='张主任', status='进行中' → 正确构建", () => {
    const project: QualityProjectV14 = buildProject("降低缺陷率", "张主任", "进行中");
    expect(project.name).toBe("降低缺陷率");
    expect(project.owner).toBe("张主任");
    expect(project.status).toBe("进行中");
  });
});

describe("addProject 空列表添加", () => {
  // 手算：空列表+新项目 → 返回长度 1（0+1=1）
  it("空列表+新项目 → 返回长度 1", () => {
    const projects: QualityProjectV14[] = [];
    const project = buildProject("降低缺陷率", "张主任", "进行中");
    const result = addProject(projects, project);
    expect(result.length).toBe(1);
  });
});

describe("closeProject 关闭项目", () => {
  // 手算：列表有 2 项目，关闭'降低缺陷率' → 返回长度 2（不删，只改状态）
  it("列表有 2 项目，关闭'降低缺陷率' → 返回长度 2", () => {
    const projects: QualityProjectV14[] = [
      buildProject("降低缺陷率", "张主任", "进行中"),
      buildProject("提升合格率", "李主任", "进行中"),
    ];
    const result = closeProject(projects, "降低缺陷率");
    expect(result.length).toBe(2);
    expect(result[0].status).toBe("已完成");
    expect(result[1].status).toBe("进行中");
  });
});

describe("buildProject 提升合格率", () => {
  // 手算：name='提升合格率', owner='李主任', status='已完成' → 正确构建
  it("name='提升合格率', owner='李主任', status='已完成' → 正确构建", () => {
    const project: QualityProjectV14 = buildProject("提升合格率", "李主任", "已完成");
    expect(project.name).toBe("提升合格率");
    expect(project.owner).toBe("李主任");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-quality-project auth:true", () => {
    const def = (emrQcQualityProjectV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-quality-project");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
