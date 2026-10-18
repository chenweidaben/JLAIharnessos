/**
 * 健澜科技 jlmedaios - 病历质控数据字典管理 V14 单测（M473-A）
 *
 * 测试 buildDataDict 创建、searchDictItems 关键词搜索、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDataDict,
  searchDictItems,
  type DataDictV14,
} from "../../src/bff/aggregators/emrDataDictV14Aggregator";
import { emrDataDictV14Routes } from "../../src/bff/routes/emrDataDictV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDataDict 病历类型", () => {
  // 手算：category='病历类型', code='EMR001', label='入院记录' → 正确创建
  it("category='病历类型', code='EMR001', label='入院记录' → 正确", () => {
    const item = buildDataDict("病历类型", "EMR001", "入院记录");
    expect(item.category).toBe("病历类型");
    expect(item.code).toBe("EMR001");
    expect(item.label).toBe("入院记录");
  });
});

describe("buildDataDict 缺陷等级", () => {
  // 手算：category='缺陷等级', code='D01', label='关键缺陷' → 正确创建
  it("category='缺陷等级', code='D01', label='关键缺陷' → 正确", () => {
    const item = buildDataDict("缺陷等级", "D01", "关键缺陷");
    expect(item.category).toBe("缺陷等级");
    expect(item.code).toBe("D01");
    expect(item.label).toBe("关键缺陷");
  });
});

describe("searchDictItems 关键词匹配", () => {
  // 手算：[{label:'入院记录'},{label:'出院小结'}]，keyword='入院' → label includes '入院' → 返回 1 条
  it("[{label:'入院记录'},{label:'出院小结'}]，keyword='入院' → 返回 1 条", () => {
    const items: DataDictV14[] = [
      { id: "D1", category: "病历类型", code: "EMR001", label: "入院记录" },
      { id: "D2", category: "病历类型", code: "EMR002", label: "出院小结" },
    ];
    const results = searchDictItems(items, "入院");
    expect(results.length).toBe(1);
    expect(results[0]?.label).toBe("入院记录");
  });
});

describe("searchDictItems 无匹配", () => {
  // 手算：keyword='不存在xyz' → 无匹配 → 返回空数组 []
  it("keyword='不存在xyz' → 返回空数组", () => {
    const items: DataDictV14[] = [
      { id: "D1", category: "病历类型", code: "EMR001", label: "入院记录" },
    ];
    expect(searchDictItems(items, "不存在xyz")).toEqual([]);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-data-dict auth:true", () => {
    const def = (emrDataDictV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-data-dict");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
