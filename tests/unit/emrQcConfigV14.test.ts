/**
 * 健澜科技 jlmedaios - 病历质控系统配置 V14 单测（M473-D，M473 收官）
 *
 * 测试 buildQcConfig 默认值、validateQcConfig 校验、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildQcConfig,
  validateQcConfig,
  type QcConfigV14,
} from "../../src/bff/aggregators/emrQcConfigV14Aggregator";
import { emrQcConfigV14Routes } from "../../src/bff/routes/emrQcConfigV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildQcConfig 默认值", () => {
  // 手算：默认 passThreshold=90，autoQcEnabled=true
  it("默认 passThreshold=90，autoQcEnabled=true", () => {
    const config = buildQcConfig();
    expect(config.passThreshold).toBe(90);
    expect(config.autoQcEnabled).toBe(true);
  });
});

describe("validateQcConfig 合法配置", () => {
  // 手算：{passThreshold: 90, defectDangerThreshold: 10, ...} → valid=true，errors=[]
  it("{passThreshold: 90, defectDangerThreshold: 10, ...} → valid=true，errors=[]", () => {
    const config: QcConfigV14 = {
      passThreshold: 90,
      defectDangerThreshold: 10,
      autoQcEnabled: true,
      reminderEnabled: true,
    };
    const result = validateQcConfig(config);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });
});

describe("validateQcConfig passThreshold 超限", () => {
  // 手算：passThreshold=150（超出 0-100）→ valid=false，errors 含提示
  it("passThreshold=150（超出 0-100）→ valid=false，errors 含提示", () => {
    const config: QcConfigV14 = {
      passThreshold: 150,
      defectDangerThreshold: 10,
      autoQcEnabled: true,
      reminderEnabled: true,
    };
    const result = validateQcConfig(config);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

describe("validateQcConfig defectDangerThreshold 超限", () => {
  // 手算：defectDangerThreshold=-5 → valid=false
  it("defectDangerThreshold=-5 → valid=false", () => {
    const config: QcConfigV14 = {
      passThreshold: 90,
      defectDangerThreshold: -5,
      autoQcEnabled: true,
      reminderEnabled: true,
    };
    const result = validateQcConfig(config);
    expect(result.valid).toBe(false);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-config auth:true", () => {
    const def = (emrQcConfigV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-config");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
