/**
 * 健澜科技 jlmedaios - 病历打印版式与套打 V14 单测（M466-A）
 *
 * 测试 buildPrintLayout paperSize='A4'/orientation='portrait'、fields 非空、renderPrintFields 含患者姓名、空 data→空字符串、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPrintLayout,
  renderPrintFields,
} from "../../src/bff/aggregators/emrPrintLayoutV14Aggregator";
import { emrPrintLayoutV14Routes } from "../../src/bff/routes/emrPrintLayoutV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildPrintLayout 纸张方向", () => {
  // 手算：固定返回 A4 + portrait
  it("paperSize='A4', orientation='portrait'", () => {
    const layout = buildPrintLayout("TPL001");
    expect(layout.paperSize).toBe("A4");
    expect(layout.orientation).toBe("portrait");
  });
});

describe("buildPrintLayout fields 非空", () => {
  // 手算：内置 3 个字段坐标 → fields.length > 0
  it("fields 数组非空", () => {
    const layout = buildPrintLayout("TPL001");
    expect(layout.fields.length).toBeGreaterThan(0);
  });
});

describe("renderPrintFields 含患者姓名", () => {
  // 手算：data.patientName="张三" → 渲染后 patientName 字段 rendered="张三"
  it("data 含 patientName → rendered 含患者姓名", () => {
    const layout = buildPrintLayout("TPL001");
    const data = { patientName: "张三", admissionDate: "2026-10-18", diagnosis: "肺炎" };
    const rendered = renderPrintFields(layout, data);
    const nameField = rendered.find((r) => r.field === "patientName");
    expect(nameField?.rendered).toBe("张三");
  });
});

describe("renderPrintFields 空 data", () => {
  // 手算：data={} → 所有字段 rendered="" （空字符串）
  it("data 空对象 → rendered 字段为空字符串", () => {
    const layout = buildPrintLayout("TPL001");
    const rendered = renderPrintFields(layout, {});
    expect(rendered.every((r) => r.rendered === "")).toBe(true);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-print-layout/:templateId auth:true", () => {
    const def = (emrPrintLayoutV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-print-layout/:templateId");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
