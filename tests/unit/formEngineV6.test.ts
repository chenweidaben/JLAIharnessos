/**
 * 健澜科技 jlmedaios - 通用表单引擎 V6 单测（M288-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildFormSchemaV6,
  prefillFormV6,
  validateFormV6,
  type FormField,
} from "../../src/bff/aggregators/formEngineV6Aggregator";
import { formEngineV6Routes } from "../../src/bff/routes/formEngineV6";

const fields: FormField[] = [
  { key: "reason", label: "事由", type: "textarea", required: true },
  { key: "days", label: "天数", type: "number", required: true },
  { key: "startDate", label: "开始日期", type: "date", required: true },
];

describe("buildFormSchemaV6", () => {
  it("3字段全部必填→requiredKeys长度=3", () => {
    const s = buildFormSchemaV6("请假", fields);
    expect(s.fieldCount).toBe(3);
    expect(s.requiredKeys.length).toBe(3);
  });
});

describe("validateFormV6", () => {
  it("空数据→3个必填错误", () => {
    const r = validateFormV6({}, fields);
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBe(3);
  });
  it("days='abc'→数字类型错误", () => {
    const r = validateFormV6({ reason: "病假", days: "abc", startDate: "2026-10-17" }, fields);
    expect(r.valid).toBe(false);
    expect(r.errors.some((e) => e.includes("days"))).toBe(true);
  });
  it("全部正确→valid", () => {
    const r = validateFormV6({ reason: "病假", days: 5, startDate: "2026-10-17" }, fields);
    expect(r.valid).toBe(true);
    expect(r.errors.length).toBe(0);
  });
});

describe("prefillFormV6", () => {
  it("reason已填+number默认0+date默认空", () => {
    const p = prefillFormV6({ reason: "病假" }, fields);
    expect(p.reason).toBe("病假");
    expect(p.days).toBe(0);
    expect(p.startDate).toBe("");
  });
});

describe("formEngineV6Routes 写权限", () => {
  it("POST /api/v1/form/submit 路由存在且 auth:true", () => {
    const post = formEngineV6Routes.find((r) => r.method === "POST" && r.path === "/api/v1/form/submit");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
