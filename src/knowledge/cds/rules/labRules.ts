/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * CDS 检验相关规则库
 * ---------------------------------------------------------------------------
 * 覆盖检验危急值（CRIT-）与检验组合异常规则。阈值参考《临床检验危急值
 * 报告制度》及常用成人危急值范围：血钾>6.5或<2.8、血糖<2.2或>22.2、
 * 血红蛋白<50、血小板<30、肌钙蛋白>0.5 等。
 */

import type { CdsRule, ConditionNode } from '../Rule.js';
import { and, labGt, labLt, listAny } from './conditionHelpers.js';

/**
 * 危急值规则快捷生成器
 */
function critRule(opts: {
  id: string;
  name: string;
  condition: ConditionNode;
  title: string;
  message: string;
  suggestions: string[];
  clinicalSignificance: string;
}): CdsRule {
  return {
    id: opts.id,
    name: opts.name,
    description: opts.clinicalSignificance,
    ruleType: 'critical_value',
    version: '1.0.0',
    status: 'enabled',
    priority: 98,
    triggerEvents: ['lab_result_report', 'manual'],
    tags: ['危急值'],
    condition: opts.condition,
    action: {
      actionType: 'block',
      level: 'critical',
      title: opts.title,
      message: opts.message,
      suggestions: opts.suggestions,
      requireOverride: false,
      evidence: [{ source: '临床检验危急值报告制度', version: '2020版' }],
    },
    author: '检验科',
    createdAt: '2026-01-01',
  };
}

/** 检验相关规则 */
export const labRules: readonly CdsRule[] = [
  critRule({
    id: 'CRIT-001',
    name: '血钾危急高',
    condition: labGt('血钾', 6.5),
    title: '危急值：严重高钾血症',
    message: '血钾 {{lab.血钾}}，超过危急阈值 6.5 mmol/L，可致严重心律失常甚至心跳骤停。',
    suggestions: [
      '立即停止补钾及保钾药物',
      '心电图监护',
      '10%葡萄糖酸钙静推拮抗心肌毒性',
      '联系肾内科评估透析',
    ],
    clinicalSignificance: '严重高钾血症，可致室颤/心脏骤停',
  }),
  critRule({
    id: 'CRIT-002',
    name: '血钾危急低',
    condition: labLt('血钾', 2.8),
    title: '危急值：严重低钾血症',
    message: '血钾 {{lab.血钾}}，低于危急阈值 2.8 mmol/L，可致肌无力、心律失常。',
    suggestions: ['在心电监护下静脉/口服补钾', '复查血气与镁离子', '排查利尿剂/呕吐腹泻等失钾原因'],
    clinicalSignificance: '严重低钾血症，可致心律失常/呼吸肌麻痹',
  }),
  critRule({
    id: 'CRIT-003',
    name: '血糖危急低',
    condition: labLt('血糖', 2.2),
    title: '危急值：严重低血糖',
    message: '血糖 {{lab.血糖}} mmol/L，低于危急阈值 2.2，可致意识障碍、脑损伤。',
    suggestions: ['立即静脉推注50%葡萄糖', '15分钟复测血糖', '排查降糖药过量/进食情况'],
    clinicalSignificance: '严重低血糖，可致昏迷/脑损伤',
  }),
  critRule({
    id: 'CRIT-004',
    name: '血糖危急高',
    condition: labGt('血糖', 22.2),
    title: '危急值：严重高血糖',
    message: '血糖 {{lab.血糖}} mmol/L，超过危急阈值 22.2，警惕糖尿病酮症酸中毒/高渗高血糖状态。',
    suggestions: ['急查血气、血酮、电解质', '小剂量胰岛素静脉泵入', '积极补液、监测出入量'],
    clinicalSignificance: '严重高血糖危象（DKA/HHS）',
  }),
  critRule({
    id: 'CRIT-005',
    name: '血红蛋白危急低',
    condition: labLt('血红蛋白', 50),
    title: '危急值：重度贫血',
    message: '血红蛋白 {{lab.血红蛋白}} g/L，低于危急阈值 50，需紧急输血评估。',
    suggestions: ['评估失血/溶血原因', '交叉配血、申请红细胞悬液', '严密监测生命体征与出血征象'],
    clinicalSignificance: '重度贫血，组织缺氧/失血性休克风险',
  }),
  critRule({
    id: 'CRIT-006',
    name: '血小板危急低',
    condition: labLt('血小板', 30),
    title: '危急值：严重血小板减少',
    message: '血小板 {{lab.血小板}}×10^9/L，低于危急阈值 30，自发性出血风险高。',
    suggestions: [
      '避免肌内注射与抗凝药物',
      '急查凝血功能与外周血涂片',
      '必要时输注血小板、排查ITP/DIC',
    ],
    clinicalSignificance: '严重血小板减少，自发性出血风险',
  }),
  critRule({
    id: 'CRIT-007',
    name: '肌钙蛋白危急高',
    condition: labGt('肌钙蛋白', 0.5),
    title: '危急值：心肌损伤标志物显著升高',
    message: '肌钙蛋白 {{lab.肌钙蛋白}} ng/mL，超过危急阈值 0.5，提示急性心肌损伤。',
    suggestions: ['立即12导联心电图', '心内科急会诊，评估急诊PCI指征', '动态复查肌钙蛋白与心电图'],
    clinicalSignificance: '急性心肌梗死/心肌损伤可能',
  }),
  critRule({
    id: 'CRIT-008',
    name: '血钠危急低',
    condition: labLt('血钠', 120),
    title: '危急值：严重低钠血症',
    message: '血钠 {{lab.血钠}} mmol/L，低于危急阈值 120，可致意识障碍/脑水肿。',
    suggestions: ['评估容量状态与病因', '谨慎补钠，避免纠正过快', '监测神经系统症状'],
    clinicalSignificance: '严重低钠血症，可致脑水肿/癫痫',
  }),
  critRule({
    id: 'CRIT-009',
    name: '血钠危急高',
    condition: labGt('血钠', 160),
    title: '危急值：严重高钠血症',
    message: '血钠 {{lab.血钠}} mmol/L，超过危急阈值 160，提示严重脱水/高渗状态。',
    suggestions: ['计算脱水程度，缓慢等渗补液', '排查尿崩症/补液不足', '监测神志与出入量'],
    clinicalSignificance: '严重高钠血症，高渗性脑病风险',
  }),
  critRule({
    id: 'CRIT-010',
    name: '白细胞危急低',
    condition: labLt('白细胞', 1.0),
    title: '危急值：粒细胞缺乏',
    message: '白细胞 {{lab.白细胞}}×10^9/L，低于危急阈值 1.0，粒细胞缺乏，极易发生严重感染。',
    suggestions: ['保护性隔离', '急查外周血涂片', '联系血液科、使用升白治疗'],
    clinicalSignificance: '粒细胞缺乏，严重感染/脓毒症风险',
  }),
  critRule({
    id: 'CRIT-011',
    name: '白细胞危急高',
    condition: labGt('白细胞', 100),
    title: '危急值：白细胞异常升高',
    message: '白细胞 {{lab.白细胞}}×10^9/L，超过危急阈值 100，需警惕白血病/类白血病反应。',
    suggestions: ['立即外周血涂片分类', '联系血液科急会诊', '排除严重感染/白血病'],
    clinicalSignificance: '白血病/类白血病反应可能',
  }),
  critRule({
    id: 'CRIT-012',
    name: '血钙危急低',
    condition: labLt('血钙', 1.75),
    title: '危急值：严重低钙血症',
    message: '血钙 {{lab.血钙}} mmol/L，低于危急阈值 1.75，可致手足搐搦/心律失常。',
    suggestions: ['静脉缓慢补钙', '急查白蛋白、镁、甲状旁腺功能', '监测心电'],
    clinicalSignificance: '严重低钙血症，抽搐/心律失常风险',
  }),
  critRule({
    id: 'CRIT-013',
    name: '凝血功能危急（INR显著延长）',
    condition: labGt('INR', 4.0),
    title: '危急值：严重凝血障碍',
    message: 'INR {{lab.INR}}，超过危急阈值 4.0，出血风险显著升高。',
    suggestions: ['停用抗凝药', '急查凝血全套与肝功能', '必要时予维生素K/凝血酶原复合物'],
    clinicalSignificance: '严重凝血障碍，出血风险',
  }),
  critRule({
    id: 'CRIT-014',
    name: '动脉血pH危急低',
    condition: labLt('pH', 7.2),
    title: '危急值：严重酸中毒',
    message: '动脉血pH {{lab.pH}}，低于危急阈值 7.2，严重酸碱失衡。',
    suggestions: [
      '结合血气分析判断代谢/呼吸性',
      '纠正原发病（感染/肾功能/糖尿病酮症）',
      'ICU评估通气与循环',
    ],
    clinicalSignificance: '严重代谢性/呼吸性酸中毒',
  }),

  // ------------------------------------------------ 检验组合异常
  {
    id: 'COMP-LAB-001',
    name: '肌钙蛋白升高合并胸痛',
    description: '肌钙蛋白危急高同时伴胸痛症状，高度提示急性冠脉综合征',
    ruleType: 'diagnostic_compliance',
    version: '1.0.0',
    status: 'enabled',
    priority: 97,
    triggerEvents: ['lab_result_report', 'manual'],
    tags: ['急性冠脉综合征', '胸痛', '组合异常'],
    condition: and(labGt('肌钙蛋白', 0.5), listAny('symptoms', '胸痛')),
    action: {
      actionType: 'block',
      level: 'critical',
      title: '组合预警：急性冠脉综合征高度可疑',
      message:
        '患者症状{{symptoms}}，肌钙蛋白{{lab.肌钙蛋白}}，高度提示急性心肌梗死，请立即按胸痛中心流程处置。',
      suggestions: [
        '立即12导联心电图并动态复查',
        '心内科/急诊PCI绿色通道',
        '嚼服阿司匹林300mg（无禁忌）',
      ],
      requireOverride: false,
      evidence: [{ source: '急性ST段抬高型心肌梗死诊疗指南', version: '2019' }],
    },
  },
  {
    id: 'COMP-LAB-002',
    name: '乳酸显著升高提示组织低灌注',
    description: '血乳酸>5.0 mmol/L 提示组织灌注不足/脓毒症',
    ruleType: 'critical_value',
    version: '1.0.0',
    status: 'enabled',
    priority: 92,
    triggerEvents: ['lab_result_report', 'manual'],
    tags: ['乳酸', '脓毒症', '灌注不足'],
    condition: labGt('乳酸', 5.0),
    action: {
      actionType: 'warning',
      level: 'critical',
      title: '危急值：严重高乳酸血症',
      message: '血乳酸 {{lab.乳酸}} mmol/L，>5.0 提示组织灌注不足，警惕脓毒症/感染性休克。',
      suggestions: [
        '按脓毒症集束化治疗（1小时内）',
        '完善血培养、血气、降钙素原',
        '评估补液与血管活性药物需求',
      ],
      requireOverride: false,
      evidence: [{ source: '脓毒症与感染性休克治疗指南', version: '2021' }],
    },
  },
];
