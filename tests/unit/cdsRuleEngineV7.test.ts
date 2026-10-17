/**
 * 健澜科技 jlmedaios - 处方前置审核规则引擎 V7 单测（M289-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  auditPrescriptionV7,
  checkContraindicationV7,
  checkDoseV7,
  checkDrugInteractionV7,
  type CdsRule,
  type PrescriptionV7,
} from "../../src/bff/aggregators/cdsRuleEngineV7Aggregator";
import { cdsRuleEngineV7Routes } from "../../src/bff/routes/cdsRuleEngineV7";

const rules: CdsRule[] = [
  { id: "r1", type: "interaction", drugCode: "WARFARIN", target: "ASPIRIN", severity: "critical", message: "出血风险", enabled: true },
  { id: "r2", type: "contraindication", drugCode: "METFORMIN", target: "CKD3", severity: "warning", message: "CKD3禁忌", enabled: true },
  { id: "r3", type: "dose", drugCode: "AMOXICILLIN", target: "2000", severity: "warning", message: "日剂量>2g", enabled: true },
];

describe("checkDrugInteractionV7", () => {
  it("同时含华法林+阿司匹林→命中", () => {
    const hits = checkDrugInteractionV7(rules, ["WARFARIN", "ASPIRIN"]);
    expect(hits.length).toBe(1);
    expect(hits[0].id).toBe("r1");
  });
  it("只含华法林→不命中", () => {
    expect(checkDrugInteractionV7(rules, ["WARFARIN"]).length).toBe(0);
  });
});

describe("checkContraindicationV7", () => {
  it("二甲双胍+患者标签CKD3→命中", () => {
    const hits = checkContraindicationV7(rules, "METFORMIN", ["CKD3"]);
    expect(hits.length).toBe(1);
  });
  it("患者标签无CKD3→不命中", () => {
    expect(checkContraindicationV7(rules, "METFORMIN", ["糖尿病"]).length).toBe(0);
  });
});

describe("checkDoseV7", () => {
  it("阿莫西林2500>2000→命中", () => {
    expect(checkDoseV7(rules, "AMOXICILLIN", 2500).length).toBe(1);
  });
  it("阿莫西林1500<2000→不命中", () => {
    expect(checkDoseV7(rules, "AMOXICILLIN", 1500).length).toBe(0);
  });
});

describe("auditPrescriptionV7", () => {
  it("三类同时命中→critical=1 warning=2 pass=false", () => {
    const prescription: PrescriptionV7 = {
      drugs: [
        { code: "WARFARIN", dose: 5 },
        { code: "ASPIRIN", dose: 100 },
        { code: "METFORMIN", dose: 1000 },
        { code: "AMOXICILLIN", dose: 2500 },
      ],
    };
    const r = auditPrescriptionV7(rules, prescription, ["CKD3"]);
    expect(r.criticalCount).toBe(1);
    expect(r.warningCount).toBe(2);
    expect(r.pass).toBe(false);
  });
  it("无命中→pass=true", () => {
    const prescription: PrescriptionV7 = { drugs: [{ code: "IBUPROFEN", dose: 200 }] };
    expect(auditPrescriptionV7(rules, prescription, []).pass).toBe(true);
  });
});

describe("cdsRuleEngineV7Routes 写权限", () => {
  it("POST /api/v1/cds/audit 路由存在且 auth:true", () => {
    const post = cdsRuleEngineV7Routes.find((r) => r.method === "POST" && r.path === "/api/v1/cds/audit");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
