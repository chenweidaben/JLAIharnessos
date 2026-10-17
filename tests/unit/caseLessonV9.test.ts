/**
 * 健澜科技 jlmedaios - Doctor MUSE 个人经验沉淀闭环 V9 单测（M291-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDoctorLegacyV9,
  logCaseLessonV9,
  searchRelevantCasesV9,
  type CaseLessonV9,
} from "../../src/bff/aggregators/caseLessonV9Aggregator";
import { caseLessonV9Routes } from "../../src/bff/routes/caseLessonV9";

const seed: CaseLessonV9[] = [
  { id: "c-1", doctorId: "d-001", patientCase: "男65", diagnosis: "急性心肌梗死", outcome: "PCI成功", success: true, tag: "PCI" },
  { id: "c-2", doctorId: "d-001", patientCase: "女70", diagnosis: "急性心肌梗死合并糖尿病", outcome: "再灌注延迟", success: false, tag: "延迟" },
  { id: "c-3", doctorId: "d-001", patientCase: "男55", diagnosis: "不稳定心绞痛", outcome: "保守好转", success: true, tag: "保守" },
];

describe("logCaseLessonV9", () => {
  it("不可变追加，原数组不变", () => {
    const next = logCaseLessonV9("d-001", {
      patientCase: "女60",
      diagnosis: "心衰",
      outcome: "利尿好转",
      success: true,
      tag: "利尿",
    }, seed);
    expect(next.length).toBe(4);
    expect(seed.length).toBe(3);
  });
});

describe("searchRelevantCasesV9", () => {
  it("关键词'急性心肌梗死'命中2条，成功优先", () => {
    const r = searchRelevantCasesV9(seed, "急性心肌梗死");
    expect(r.length).toBe(2);
    expect(r[0].success).toBe(true); // 成功排前
    expect(r[1].success).toBe(false);
  });
});

describe("buildDoctorLegacyV9", () => {
  it("d-001: total=3 success=2 fail=1 top1=急性心肌梗死", () => {
    const l = buildDoctorLegacyV9(seed);
    expect(l.total).toBe(3);
    expect(l.successCount).toBe(2);
    expect(l.failCount).toBe(1);
    expect(l.topConditions[0]).toBe("急性心肌梗死");
  });
  it("空态→全部为0", () => {
    const l = buildDoctorLegacyV9([]);
    expect(l.total).toBe(0);
    expect(l.successCount).toBe(0);
  });
});

describe("caseLessonV9Routes 写权限", () => {
  it("POST /api/v1/agent/case-lesson 路由存在且 auth:true", () => {
    const post = caseLessonV9Routes.find((r) => r.method === "POST" && r.path === "/api/v1/agent/case-lesson");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
