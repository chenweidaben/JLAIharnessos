/**
 * 健澜科技 jlmedaios - 药房审方智能助手（M120-D）纯函数单测
 *
 * 覆盖：相互作用检测（critical / warning / 不命中）、过敏匹配（严重 critical / 一般 warning）、
 * 风险评估（最高级别汇总 + summary）、建议生成（暂缓 / 核对 / 安全三分支）、非法输入安全降级。
 * 全部 mock 数据，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';

import {
  buildPharmacyAssistant,
  type PharmacyAssistantData,
} from '../../src/bff/aggregators/pharmacyAssistantAggregator';

const drug = (name: string, extra?: Partial<{ id: string; dosage: string | null; route: string | null }>) => ({
  id: extra?.id ?? name, name, dosage: extra?.dosage ?? null, route: extra?.route ?? null,
});

const baseData = (over: Partial<PharmacyAssistantData> = {}): PharmacyAssistantData => ({
  drugs: [], allergies: [], historyBlocks: [], ...over,
});

describe('相互作用检测', () => {
  it('空处方 / 非法输入 -> 无相互作用，不抛错', () => {
    const r = buildPharmacyAssistant('ph001', 'rx001', baseData());
    expect(r.interactions.length).toBe(0);
    // @ts-expect-error 故意传非法 data 验证防御
    expect(buildPharmacyAssistant('ph001', 'rx001', undefined).interactions.length).toBe(0);
  });

  it('华法林 + 阿司匹林 -> critical 相互作用', () => {
    const r = buildPharmacyAssistant('ph001', 'rx002', baseData({
      drugs: [drug('华法林片'), drug('阿司匹林肠溶片')],
    }));
    const hit = r.interactions.find((i) => i.rule === 'interaction.华法林_阿司匹林');
    expect(hit?.level).toBe('critical');
    expect(hit?.reason).toContain('出血');
  });

  it('辛伐他汀 + 克拉霉素 -> critical（CYP3A4 横纹肌溶解）', () => {
    const r = buildPharmacyAssistant('ph001', 'rx003', baseData({
      drugs: [drug('辛伐他汀片'), drug('克拉霉素缓释片')],
    }));
    expect(r.interactions.some((i) => i.rule === 'interaction.辛伐他汀_克拉霉素' && i.level === 'critical')).toBe(true);
  });

  it('左氧氟沙星 + 硫酸亚铁 -> warning（螯合降吸收）', () => {
    const r = buildPharmacyAssistant('ph001', 'rx004', baseData({
      drugs: [drug('左氧氟沙星片'), drug('硫酸亚铁片')],
    }));
    const hit = r.interactions.find((i) => i.drugA.includes('左氧') || i.drugB.includes('左氧'));
    expect(hit?.level).toBe('warning');
  });

  it('无禁忌组合的处方 -> 不产出相互作用', () => {
    const r = buildPharmacyAssistant('ph001', 'rx005', baseData({
      drugs: [drug('维生素C片'), drug('氯化钠注射液')],
    }));
    expect(r.interactions.length).toBe(0);
  });
});

describe('过敏史匹配', () => {
  it('青霉素严重过敏 + 阿莫西林 -> critical 过敏告警', () => {
    const r = buildPharmacyAssistant('ph001', 'rx006', baseData({
      drugs: [drug('阿莫西林胶囊')],
      allergies: [{ allergen: '青霉素', reaction: '皮疹、喉头水肿', severity: 'severe' }],
    }));
    expect(r.allergies.length).toBe(1);
    expect(r.allergies[0].level).toBe('critical');
    expect(r.allergies[0].drug).toContain('阿莫西林');
  });

  it('磺胺过敏（中度）+ 复方磺胺甲噁唑 -> warning', () => {
    const r = buildPharmacyAssistant('ph001', 'rx007', baseData({
      drugs: [drug('复方磺胺甲噁唑片')],
      allergies: [{ allergen: '磺胺类', reaction: '药疹', severity: 'moderate' }],
    }));
    expect(r.allergies.length).toBe(1);
    expect(r.allergies[0].level).toBe('warning');
  });

  it('有过敏史但处方不含相关药品 -> 无过敏告警', () => {
    const r = buildPharmacyAssistant('ph001', 'rx008', baseData({
      drugs: [drug('布洛芬缓释胶囊')],
      allergies: [{ allergen: '青霉素', severity: 'mild' }],
    }));
    expect(r.allergies.length).toBe(0);
  });
});

describe('风险评估', () => {
  it('存在 critical -> 整体 riskLevel 为 critical，summary 提示暂缓', () => {
    const r = buildPharmacyAssistant('ph001', 'rx009', baseData({
      drugs: [drug('华法林片'), drug('阿司匹林肠溶片')],
    }));
    expect(r.riskLevel).toBe('critical');
    expect(r.summary).toContain('暂缓调配');
  });

  it('仅 warning（左氧+铁剂）-> 整体 warning', () => {
    const r = buildPharmacyAssistant('ph001', 'rx010', baseData({
      drugs: [drug('左氧氟沙星片'), drug('硫酸亚铁片')],
    }));
    expect(r.riskLevel).toBe('warning');
  });

  it('肾功能不全 + 万古霉素 -> 触发特殊人群 warning', () => {
    const r = buildPharmacyAssistant('ph001', 'rx011', baseData({
      drugs: [drug('注射用万古霉素')],
      patient: { renalImpaired: true },
    }));
    expect(r.riskLevel).toBe('warning');
    expect(r.suggestions.some((s) => s.title === '特殊人群剂量复核')).toBe(true);
  });

  it('无任何风险 -> riskLevel 为 info', () => {
    const r = buildPharmacyAssistant('ph001', 'rx012', baseData({
      drugs: [drug('维生素C片')],
    }));
    expect(r.riskLevel).toBe('info');
  });
});

describe('建议生成', () => {
  it('critical 风险 -> 生成「建议暂缓调配」建议', () => {
    const r = buildPharmacyAssistant('ph001', 'rx013', baseData({
      drugs: [drug('辛伐他汀片'), drug('克拉霉素缓释片')],
    }));
    expect(r.suggestions.some((s) => s.level === 'critical' && s.title === '建议暂缓调配')).toBe(true);
  });

  it('warning 风险 -> 生成「调配前需核对」建议', () => {
    const r = buildPharmacyAssistant('ph001', 'rx014', baseData({
      drugs: [drug('左氧氟沙星片'), drug('硫酸亚铁片')],
    }));
    expect(r.suggestions.some((s) => s.level === 'warning' && s.title === '调配前需核对')).toBe(true);
  });

  it('无风险 -> 生成「未发现明显用药风险」安全建议', () => {
    const r = buildPharmacyAssistant('ph001', 'rx015', baseData({
      drugs: [drug('维生素C片')],
    }));
    expect(r.suggestions.some((s) => s.level === 'info' && s.title === '未发现明显用药风险')).toBe(true);
  });

  it('用药史时间线透传，且回显药师与处方 ID', () => {
    const r = buildPharmacyAssistant('ph007', 'rx016', baseData({
      drugs: [drug('维生素C片')],
      historyBlocks: [{ period: '2026-10-01', summary: '布洛芬缓释胶囊', riskFlags: ['待审方'] }],
    }));
    expect(r.pharmacistId).toBe('ph007');
    expect(r.prescriptionId).toBe('rx016');
    expect(r.historyBlocks.length).toBe(1);
    expect(r.historyBlocks[0].riskFlags).toEqual(['待审方']);
  });
});
