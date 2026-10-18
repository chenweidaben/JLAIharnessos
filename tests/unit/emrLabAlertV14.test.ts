/**
 * 健澜科技 jlmedaios - 病历检验异常值提醒 V14 单测（M537-C）
 *
 * 测试 buildLabAlert 构建检验提醒、detectAbnormalLab 异常值检测、buildLabAlertReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildLabAlert,
  buildLabAlertReport,
  detectAbnormalLab,
  type LabAlertInputV14,
} from "../../src/bff/aggregators/emrLabAlertV14Aggregator";
import { emrLabAlertV14Routes } from "../../src/bff/routes/emrLabAlertV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildLabAlert 构建检验提醒", () => {
  // 手算：recordId='REC402', dept='检验科' → 正确构建
  it("recordId='REC402', dept='检验科' → 正确构建", () => {
    const alert = buildLabAlert("REC402", "检验科");
    expect(alert.recordId).toBe("REC402");
    expect(alert.dept).toBe("检验科");
  });
});

describe("detectAbnormalLab 偏高", () => {
  // 手算：{testName='白细胞', value=12.5, normalMin=4, normalMax=10}
  // 手算：abnormal = 12.5<4? false || 12.5>10? true → true
  // 手算：direction = 12.5>10 → '偏高'
  // 手算：message = '白细胞偏高，请关注'
  it("{testName='白细胞', value=12.5, normalMin=4, normalMax=10} → abnormal=true, direction='偏高', message='白细胞偏高，请关注'", () => {
    const input: LabAlertInputV14 = { testName: "白细胞", value: 12.5, normalMin: 4, normalMax: 10 };
    const result = detectAbnormalLab(input);
    expect(result.abnormal).toBe(true);
    expect(result.direction).toBe("偏高");
    expect(result.message).toBe("白细胞偏高，请关注");
  });
});

describe("detectAbnormalLab 正常", () => {
  // 手算：{testName='血红蛋白', value=130, normalMin=110, normalMax=160}
  // 手算：abnormal = 130<110? false || 130>160? false → false
  // 手算：direction = '正常'
  // 手算：message = '正常范围'
  it("{testName='血红蛋白', value=130, normalMin=110, normalMax=160} → abnormal=false, direction='正常', message='正常范围'", () => {
    const input: LabAlertInputV14 = { testName: "血红蛋白", value: 130, normalMin: 110, normalMax: 160 };
    const result = detectAbnormalLab(input);
    expect(result.abnormal).toBe(false);
    expect(result.direction).toBe("正常");
    expect(result.message).toBe("正常范围");
  });
});

describe("buildLabAlertReport 构建报告", () => {
  // 手算：{abnormal=true, direction='偏高', message='白细胞偏高，请关注'}
  // 手算：透传 abnormal + direction + message
  it("{abnormal=true, direction='偏高', message='白细胞偏高，请关注'} → 正确返回（透传）", () => {
    const report = buildLabAlertReport({ abnormal: true, direction: "偏高", message: "白细胞偏高，请关注" });
    expect(report.abnormal).toBe(true);
    expect(report.direction).toBe("偏高");
    expect(report.message).toBe("白细胞偏高，请关注");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-lab-alert auth:true", () => {
    const def = (emrLabAlertV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-lab-alert");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
