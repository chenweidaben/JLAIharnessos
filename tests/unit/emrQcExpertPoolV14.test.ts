/**
 * 健澜科技 jlmedaios - 病历质控专家库管理 V14 单测（M474-C）
 *
 * 测试 buildExpertPool 创建、searchExpertsByDept 按科室过滤、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildExpertPool,
  searchExpertsByDept,
  type ExpertV14,
} from "../../src/bff/aggregators/emrQcExpertPoolV14Aggregator";
import { emrQcExpertPoolV14Routes } from "../../src/bff/routes/emrQcExpertPoolV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildExpertPool 创建", () => {
  // 手算：name='王医生', dept='内科', title='主任医师' → 正确创建
  it("name='王医生', dept='内科', title='主任医师' → 正确", () => {
    const expert = buildExpertPool("王医生", "内科", "主任医师");
    expect(expert.name).toBe("王医生");
    expect(expert.dept).toBe("内科");
    expect(expert.title).toBe("主任医师");
  });
});

describe("searchExpertsByDept 按科室过滤", () => {
  // 手算：[{dept:'内科'},{dept:'外科'}]，dept='内科' → 返回 1 条
  it("[{dept:'内科'},{dept:'外科'}]，dept='内科' → 返回 1 条", () => {
    const experts: ExpertV14[] = [
      { id: "E1", name: "王医生", dept: "内科", title: "主任医师" },
      { id: "E2", name: "李医生", dept: "外科", title: "副主任医师" },
    ];
    const results = searchExpertsByDept(experts, "内科");
    expect(results.length).toBe(1);
    expect(results[0]?.dept).toBe("内科");
  });
});

describe("searchExpertsByDept 无匹配", () => {
  // 手算：dept='不存在xyz' → 返回空数组 []
  it("dept='不存在xyz' → 返回空数组", () => {
    const experts: ExpertV14[] = [
      { id: "E1", name: "王医生", dept: "内科", title: "主任医师" },
    ];
    expect(searchExpertsByDept(experts, "不存在xyz")).toEqual([]);
  });
});

describe("searchExpertsByDept 空 dept", () => {
  // 手算：空 dept 参数 → 返回全部（2 条）
  it("空 dept 参数 → 返回全部", () => {
    const experts: ExpertV14[] = [
      { id: "E1", name: "王医生", dept: "内科", title: "主任医师" },
      { id: "E2", name: "李医生", dept: "外科", title: "副主任医师" },
    ];
    expect(searchExpertsByDept(experts, "").length).toBe(2);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-expert-pool auth:true", () => {
    const def = (emrQcExpertPoolV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-expert-pool");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
