/**
 * 健澜科技 jlmedaios - 手术安全学习引擎纯函数单测（依据宪法第四章）
 *
 * 不依赖数据库/BFF：直接测 buildSurgerySafetyPattern 与 prepRiskReminder 纯函数。
 *   1) 风险模式提取：按 (surgeryType, riskFactor) 归并分组；
 *   2) 发生率计算：occurrenceRate = 命中该风险点的核查表数 / 该术式核查总数；
 *   3) 平均准备时长 avgPrepMinutes 与并发症率 complicationRate 统计正确；
 *   4) 术前提醒生成：命中术式列出风险点及百分比，无沉淀时返回安抚文案。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, it, expect } from 'bun:test';
import {
  buildSurgerySafetyPattern,
  prepRiskReminder,
  type SurgeryChecklistRecord,
  type SurgeryOutcomeRecord,
} from '../../src/bff/aggregators/surgerySafetyLearningAggregator';

const cl = (
  surgeryType: string,
  riskFactors: string[],
  prepMinutes: number,
): SurgeryChecklistRecord => ({ surgeryType, riskFactors, prepMinutes });

const oc = (surgeryType: string, complication: boolean): SurgeryOutcomeRecord => ({
  surgeryType,
  complication,
});

describe('buildSurgerySafetyPattern', () => {
  it('空输入 -> 空模式列表', () => {
    expect(buildSurgerySafetyPattern([], [])).toEqual([]);
  });

  it('风险模式提取：按 (surgeryType, riskFactor) 归并分组，同组合并、异组拆分', () => {
    const patterns = buildSurgerySafetyPattern(
      [
        cl('腹腔镜胆囊切除术', ['术前抗生素超时'], 50),
        cl('腹腔镜胆囊切除术', ['术前抗生素超时', '电刀负极板位置不当'], 65),
        cl('全髋关节置换术', ['抗生素骨水泥准备延误'], 90),
      ],
      [],
    );
    // 三个 (术式, 风险点) 组合 -> 三行
    expect(patterns).toHaveLength(3);
    const abx = patterns.find(
      (p) => p.surgeryType === '腹腔镜胆囊切除术' && p.riskFactor === '术前抗生素超时',
    )!;
    expect(abx).toBeDefined();
    const hip = patterns.find((p) => p.surgeryType === '全髋关节置换术')!;
    expect(hip.riskFactor).toBe('抗生素骨水泥准备延误');
  });

  it('发生率计算：occurrenceRate = 命中该风险点的核查表数 / 该术式核查总数', () => {
    const patterns = buildSurgerySafetyPattern(
      [
        cl('腹腔镜胆囊切除术', ['术前抗生素超时'], 50),
        cl('腹腔镜胆囊切除术', ['术前抗生素超时'], 65),
        cl('腹腔镜胆囊切除术', ['术前抗生素超时'], 45),
        cl('腹腔镜胆囊切除术', [], 40),
        cl('腹腔镜胆囊切除术', ['电刀负极板位置不当'], 55),
      ],
      [],
    );
    const abx = patterns.find(
      (p) => p.surgeryType === '腹腔镜胆囊切除术' && p.riskFactor === '术前抗生素超时',
    )!;
    // 5 台里 3 台出现术前抗生素超时 -> 0.6
    expect(abx.occurrenceRate).toBe(0.6);
    const pad = patterns.find((p) => p.riskFactor === '电刀负极板位置不当')!;
    // 5 台里 1 台出现 -> 0.2
    expect(pad.occurrenceRate).toBe(0.2);
  });

  it('平均准备时长与并发症率统计正确', () => {
    const patterns = buildSurgerySafetyPattern(
      [
        cl('腹腔镜胆囊切除术', ['术前抗生素超时'], 40),
        cl('腹腔镜胆囊切除术', ['术前抗生素超时'], 50),
        cl('腹腔镜胆囊切除术', [], 45),
      ],
      [
        oc('腹腔镜胆囊切除术', true),
        oc('腹腔镜胆囊切除术', false),
        oc('腹腔镜胆囊切除术', false),
      ],
    );
    expect(patterns).toHaveLength(1);
    // 平均准备 (40+50+45)/3 = 45 分钟
    expect(patterns[0].avgPrepMinutes).toBe(45);
    // 3 台里 1 台并发症 -> 0.3333
    expect(patterns[0].complicationRate).toBe(0.3333);
  });

  it('该术式无结局记录时并发症率记 0，不抛错', () => {
    const patterns = buildSurgerySafetyPattern(
      [cl('全髋关节置换术', ['抗生素骨水泥准备延误'], 90)],
      [],
    );
    expect(patterns[0].complicationRate).toBe(0);
  });

  it('输出按 occurrenceRate 降序排列', () => {
    const patterns = buildSurgerySafetyPattern(
      [
        cl('腹腔镜胆囊切除术', ['电刀负极板位置不当'], 55),
        cl('腹腔镜胆囊切除术', ['术前抗生素超时'], 50),
        cl('腹腔镜胆囊切除术', ['术前抗生素超时'], 65),
      ],
      [],
    );
    // 术前抗生素超时 2/3 ≈ 0.6667 > 电刀负极板 1/3 ≈ 0.3333
    expect(patterns[0].riskFactor).toBe('术前抗生素超时');
    expect(patterns[0].occurrenceRate).toBeGreaterThan(patterns[1].occurrenceRate);
  });
});

describe('prepRiskReminder', () => {
  const patterns = buildSurgerySafetyPattern(
    [
      cl('腹腔镜胆囊切除术', ['术前抗生素超时'], 50),
      cl('腹腔镜胆囊切除术', ['术前抗生素超时', '电刀负极板位置不当'], 65),
      cl('腹腔镜胆囊切除术', ['术前抗生素超时'], 45),
      cl('腹腔镜胆囊切除术', [], 40),
      cl('腹腔镜胆囊切除术', ['电刀负极板位置不当'], 55),
    ],
    [
      oc('腹腔镜胆囊切除术', true),
      oc('腹腔镜胆囊切除术', false),
      oc('腹腔镜胆囊切除术', false),
      oc('腹腔镜胆囊切除术', false),
      oc('腹腔镜胆囊切除术', false),
    ],
  );

  it('命中术式：列出风险点及历史发生率、平均准备时长与并发症率', () => {
    const text = prepRiskReminder('腹腔镜胆囊切除术', patterns);
    expect(text).toContain('【术前风险提示】腹腔镜胆囊切除术');
    // 术前抗生素超时 3/5 = 60.0%
    expect(text).toContain('术前抗生素超时（60.0%）');
    // 电刀负极板位置不当 2/5 = 40.0%
    expect(text).toContain('电刀负极板位置不当（40.0%）');
    // 平均准备 (50+65+45+40+55)/5 = 51 分钟；并发症 1/5 = 20.0%
    expect(text).toContain('平均术前准备 51 分钟');
    expect(text).toContain('并发症率 20.0%');
  });

  it('只展示命中术式的风险点，不串入其他术式', () => {
    const text = prepRiskReminder('全髋关节置换术', patterns);
    expect(text).toContain('全髋关节置换术');
    // patterns 里没有全髋关节置换术的行 -> 走无沉淀分支
    expect(text).toContain('暂无历史风险点沉淀');
  });

  it('无历史沉淀时返回安抚文案', () => {
    const text = prepRiskReminder('冠状动脉搭桥术', patterns);
    expect(text).toBe('【术前风险提示】冠状动脉搭桥术 暂无历史风险点沉淀，按常规术前核查流程准备即可。');
  });

  it('空 patterns 输入不抛错', () => {
    expect(() => prepRiskReminder('腹腔镜胆囊切除术', [])).not.toThrow();
  });
});
