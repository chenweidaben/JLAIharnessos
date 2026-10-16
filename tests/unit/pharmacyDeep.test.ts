/**
 * 健澜科技 jlmedaios — 【质量提升与新场景】医院智能药房深化纯函数单测（M173-C）
 *
 * 覆盖：
 *  - buildSmartPharmacy（四大能力域盘点 + 差错下降目标 + 安全红线）；
 *  - predictDrugDemand（基线 × 季节系数外推 / 周期总量 / 高峰日 / 置信度）；
 *  - optimizeDrugInventory（提前期需求 / 安全库存 / 再订货点 / 建议补货量）；
 *  - detectDrugAdverseEvent（过敏史 / 妊娠禁忌 / 肾损 / 儿童慎用 / 症状群分级）。
 * 与持久化解耦，不触库，不写 SQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  buildSmartPharmacy,
  detectDrugAdverseEvent,
  optimizeDrugInventory,
  predictDrugDemand,
  type PatientSnapshot,
  type PrescriptionSnapshot,
} from '../../src/bff/aggregators/pharmacyDeepAggregator';

describe('buildSmartPharmacy（摆药/审方/库存/用药四件套）', () => {
  it('四大能力域齐全，且每个域 KPI 都指向差错率下降', () => {
    const r = buildSmartPharmacy();
    expect(r.pillars.map((p) => p.code)).toEqual(['dispense', 'review', 'stock', 'medication']);
    for (const p of r.pillars) {
      expect(p.capabilities.length).toBeGreaterThanOrEqual(3);
      // 目标必须比基线更严（差错率更低）
      expect(p.kpi.targetRate).toBeLessThan(p.kpi.baselineRate);
      expect(p.kpi.reductionPctPoints).toBeGreaterThan(0);
    }
  });

  it('综合差错下降幅度为正，且安全红线含「AI 不自动发药」', () => {
    const r = buildSmartPharmacy();
    expect(r.overallErrorReductionPctPoints).toBeGreaterThan(0);
    expect(r.guardrails.join('')).toContain('AI 不自动发药');
    expect(r.valueStatement).toContain('差错');
  });
});

describe('predictDrugDemand（药品需求预测）', () => {
  it('周期总需求 = 预测日均 × 周期天数，高峰日落在周期内', () => {
    const r = predictDrugDemand('D-AMOX-001', 14, 'none');
    expect(r.periodDays).toBe(14);
    expect(r.periodTotal).toBe(r.forecastDaily * 14);
    expect(r.peakDay).toBeGreaterThanOrEqual(1);
    expect(r.peakDay).toBeLessThanOrEqual(14);
    expect(r.peakDaily).toBeGreaterThanOrEqual(r.forecastDaily);
    expect(r.confidence).toBeGreaterThan(0);
    expect(r.confidence).toBeLessThanOrEqual(1);
  });

  it('流感季系数 1.65 显著高于无季节波动（需求预测会上浮）', () => {
    const flu = predictDrugDemand('D-AMOX-001', 7, 'flu_peak');
    const flat = predictDrugDemand('D-AMOX-001', 7, 'none');
    expect(flu.seasonalFactor).toBe(1.65);
    expect(flu.forecastDaily).toBeGreaterThan(flat.forecastDaily);
    // 波动越大，置信度反而越低
    expect(flu.confidence).toBeLessThan(flat.confidence);
  });

  it('周期天数越界时收敛到 1..365，未传（0）回落默认 7 天', () => {
    const r = predictDrugDemand('D-002', 99999, 'year_round');
    expect(r.periodDays).toBe(365);
    const r2 = predictDrugDemand('D-002', -5, 'year_round');
    expect(r2.periodDays).toBe(1);
    const r3 = predictDrugDemand('D-002', 0, 'year_round');
    expect(r3.periodDays).toBe(7);
  });
});

describe('optimizeDrugInventory（库存优化：到点自动补货，不缺货不积压）', () => {
  it('再订货点 = 提前期需求 + 安全库存；建议补货量 = 两周用量', () => {
    const r = optimizeDrugInventory('D-AMOX-001', 60, 7);
    expect(r.dailyDemand).toBe(60);
    expect(r.leadTimeDays).toBe(7);
    expect(r.leadTimeDemand).toBe(60 * 7);
    // 安全库存 ≥ 提前期需求的一半，且至少 3 天用量
    expect(r.safetyStock).toBe(Math.max(Math.round(60 * 7 * 0.5), 60 * 3));
    expect(r.reorderPoint).toBe(r.leadTimeDemand + r.safetyStock);
    expect(r.maxStock).toBe(r.reorderPoint + 60 * 14);
    expect(r.suggestedOrderQty).toBe(r.maxStock - r.reorderPoint);
    expect(r.suggestedOrderQty).toBe(60 * 14);
    expect(r.daysOfCover).toBeGreaterThan(0);
  });

  it('提前期超长（>10 天）时给出双供应商/谈短交期提醒', () => {
    const r = optimizeDrugInventory('D-VANCO-009', 20, 21);
    expect(r.leadTimeDays).toBe(21);
    expect(r.shortageAlert).toContain('双供应商');
  });

  it('提前期越界收敛到 1..60；零需求时天数覆盖为 0 且不抛错', () => {
    const r = optimizeDrugInventory('D-X', 0, 999);
    expect(r.leadTimeDays).toBe(60);
    expect(r.daysOfCover).toBe(0);
  });
});

describe('detectDrugAdverseEvent（不良反应预警）', () => {
  const cleanPatient: PatientSnapshot = {
    age: 45, gender: 'male', allergies: [],
  };

  it('已知过敏史与本品匹配 → severe，必须暂停发药', () => {
    const rx: PrescriptionSnapshot = {
      drugName: '阿司匹林肠溶片', drugClass: ['NSAID'], doseMg: 300,
    };
    const patient: PatientSnapshot = {
      age: 45, gender: 'male', allergies: ['阿司匹林'],
    };
    const r = detectDrugAdverseEvent(rx, patient, []);
    expect(r.level).toBe('severe');
    expect(r.holdDispense).toBe(true);
    expect(r.triggers.join('')).toContain('过敏');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });

  it('妊娠患者使用妊娠禁忌药（利巴韦林）→ severe', () => {
    const rx: PrescriptionSnapshot = {
      drugName: '利巴韦林片', drugClass: ['抗病毒'], doseMg: 600,
    };
    const patient: PatientSnapshot = {
      age: 28, gender: 'female', pregnant: true, allergies: [],
    };
    const r = detectDrugAdverseEvent(rx, patient, []);
    expect(r.level).toBe('severe');
    expect(r.holdDispense).toBe(true);
    expect(r.triggers.join('')).toContain('妊娠');
  });

  it('肾功能不全用氨基糖苷类 → moderate，建议按 eGFR 调剂量', () => {
    const rx: PrescriptionSnapshot = {
      drugName: '阿米卡星针', drugClass: ['氨基糖苷'], doseMg: 1000,
    };
    const patient: PatientSnapshot = {
      age: 70, gender: 'male', renalImpairment: true, allergies: [],
    };
    const r = detectDrugAdverseEvent(rx, patient, []);
    expect(r.level).toBe('moderate');
    expect(r.holdDispense).toBe(false);
    expect(r.triggers.join('')).toContain('肾');
    expect(r.suggestions.join('')).toContain('eGFR');
  });

  it('1 岁婴幼儿用阿司匹林 → moderate（儿童慎用提醒）', () => {
    const rx: PrescriptionSnapshot = {
      drugName: '阿司匹林泡腾片', drugClass: [], doseMg: 100,
    };
    const patient: PatientSnapshot = {
      age: 1, gender: 'female', allergies: [],
    };
    const r = detectDrugAdverseEvent(rx, patient, []);
    expect(r.level).toBe('moderate');
    expect(r.triggers.join('')).toContain('婴幼儿');
  });

  it('用药后出现皮疹瘙痒 → moderate 皮肤过敏反应预警', () => {
    const rx: PrescriptionSnapshot = {
      drugName: '布洛芬缓释胶囊', drugClass: ['NSAID'], doseMg: 600,
    };
    const r = detectDrugAdverseEvent(rx, cleanPatient, ['皮疹', '瘙痒']);
    expect(r.level).toBe('moderate');
    expect(r.matchedSymptoms.length).toBeGreaterThan(0);
    expect(r.matchedSymptoms.join('')).toContain('皮肤过敏');
  });

  it('用药后出现呼吸困难/血压下降 → severe（速发过敏）', () => {
    const rx: PrescriptionSnapshot = {
      drugName: '青霉素v钾片', drugClass: ['β内酰胺'], doseMg: 500,
    };
    const r = detectDrugAdverseEvent(rx, cleanPatient, ['呼吸困难', '血压下降']);
    expect(r.level).toBe('severe');
    expect(r.holdDispense).toBe(true);
  });

  it('干净处方 + 干净患者 + 无症状 → none，常规发药指导', () => {
    const rx: PrescriptionSnapshot = {
      drugName: '维生素C片', drugClass: ['维生素'], doseMg: 200,
    };
    const r = detectDrugAdverseEvent(rx, cleanPatient, []);
    expect(r.level).toBe('none');
    expect(r.holdDispense).toBe(false);
    expect(r.triggers).toEqual([]);
    expect(r.suggestions.join('')).toContain('常规发药');
  });
});
