/**
 * 健澜科技 jlmedaios - 质控专家库管理 V14 单测（M502-A）
 *
 * 测试 buildExpertLibrary 构建、addExpert 添加、removeExpert 移除、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  addExpert,
  buildExpertLibrary,
  removeExpert,
  type ExpertLibraryV14,
} from "../../src/bff/aggregators/emrQcExpertLibraryV14Aggregator";
import { emrQcExpertLibraryV14Routes } from "../../src/bff/routes/emrQcExpertLibraryV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildExpertLibrary 张教授", () => {
  // 手算：name='张教授', dept='内科', specialty='心血管' → 正确构建
  it("name='张教授', dept='内科', specialty='心血管' → 正确构建", () => {
    const expert: ExpertLibraryV14 = buildExpertLibrary("张教授", "内科", "心血管");
    expect(expert.name).toBe("张教授");
    expect(expert.dept).toBe("内科");
    expect(expert.specialty).toBe("心血管");
  });
});

describe("addExpert 空库添加", () => {
  // 手算：空库+新专家 → 返回长度 1（0+1=1）
  it("空库+新专家 → 返回长度 1", () => {
    const library: ExpertLibraryV14[] = [];
    const expert = buildExpertLibrary("张教授", "内科", "心血管");
    const result = addExpert(library, expert);
    expect(result.length).toBe(1);
  });
});

describe("removeExpert 移除专家", () => {
  // 手算：库中有 2 专家，移除'张教授' → 返回长度 1（2-1=1）
  it("库中有 2 专家，移除'张教授' → 返回长度 1", () => {
    const library: ExpertLibraryV14[] = [
      buildExpertLibrary("张教授", "内科", "心血管"),
      buildExpertLibrary("李教授", "外科", "骨科"),
    ];
    const result = removeExpert(library, "张教授");
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("李教授");
  });
});

describe("buildExpertLibrary 李教授", () => {
  // 手算：name='李教授', dept='外科', specialty='骨科' → 正确构建
  it("name='李教授', dept='外科', specialty='骨科' → 正确构建", () => {
    const expert: ExpertLibraryV14 = buildExpertLibrary("李教授", "外科", "骨科");
    expect(expert.name).toBe("李教授");
    expect(expert.dept).toBe("外科");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-expert-library auth:true", () => {
    const def = (emrQcExpertLibraryV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-expert-library");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
