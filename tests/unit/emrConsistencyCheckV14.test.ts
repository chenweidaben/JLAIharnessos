/**
 * 健澜科技 jlmedaios - 病历一致性检查 V14 单测（M476-B）
 *
 * 测试 findConsistencyConflicts 冲突识别、checkConsistency 冲突计数、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  checkConsistency,
  findConsistencyConflicts,
  type EmrSectionV14,
} from "../../src/bff/aggregators/emrConsistencyCheckV14Aggregator";
import { emrConsistencyCheckV14Routes } from "../../src/bff/routes/emrConsistencyCheckV14";
import type { RouteDef } from "../../src/bff/types";

describe("findConsistencyConflicts 矛盾", () => {
  // 手算：现病史写"体温正常"，诊断写"发热待查" → 关键词矛盾对（发热 vs 体温正常）→ 非空冲突列表
  it("2 段落内容矛盾 → 返回非空冲突列表", () => {
    const sections: EmrSectionV14[] = [
      { name: "现病史", content: "体温正常，无咳嗽" },
      { name: "诊断", content: "发热待查" },
    ];
    const conflicts = findConsistencyConflicts(sections);
    expect(conflicts.length).toBeGreaterThan(0);
  });
});

describe("findConsistencyConflicts 一致", () => {
  // 手算：主诉"咳嗽"、诊断"上呼吸道感染" → 不含矛盾关键词对 → 空数组
  it("2 段落内容一致 → 返回空数组", () => {
    const sections: EmrSectionV14[] = [
      { name: "主诉", content: "咳嗽 3 天" },
      { name: "诊断", content: "上呼吸道感染" },
    ];
    expect(findConsistencyConflicts(sections)).toEqual([]);
  });
});

describe("checkConsistency 无冲突", () => {
  // 手算：无矛盾关键词 → conflictCount=0
  it("无冲突 → conflictCount=0", () => {
    const sections: EmrSectionV14[] = [
      { name: "主诉", content: "咳嗽 3 天" },
      { name: "诊断", content: "上呼吸道感染" },
    ];
    const result = checkConsistency(sections);
    expect(result.conflictCount).toBe(0);
  });
});

describe("checkConsistency 2 个冲突", () => {
  // 手算：两对矛盾关键词（发热 vs 体温正常 + 高血压 vs 血压正常）→ conflictCount=2
  it("2 个冲突 → conflictCount=2", () => {
    const sections: EmrSectionV14[] = [
      { name: "现病史", content: "体温正常，血压正常" },
      { name: "诊断", content: "发热待查，高血压" },
    ];
    const result = checkConsistency(sections);
    expect(result.conflictCount).toBe(2);
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-consistency-check auth:true", () => {
    const def = (emrConsistencyCheckV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-consistency-check");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
