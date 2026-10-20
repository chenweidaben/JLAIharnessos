/**
 * 健澜科技 jlmedaios - M214 电子病历5级深度 + 互联互通四甲深度 + BI分析
 *
 * 病历质控规则引擎/版本对比/修改痕迹 + FHIR Bundle搜索/Composition/映射 + BI趋势/对比
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/* ==================== 一、电子病历 5 级深度 ==================== */

/** GET /api/v1/emr/quality-rules-engine - 病历内涵质控规则引擎 */
async function handleEmrQualityRulesEngine(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const rules = [
    {
      id: 'QRE-001',
      name: '主诉不完整',
      checkItem: '主诉是否包含主要症状+持续时间',
      deduction: '扣2分',
      triggerCondition: '主诉字数<10字 或 缺少时间描述',
      example: {
        correct: '胸闷3天，加重伴胸痛6小时',
        wrong: '胸闷不适',
      },
    },
    {
      id: 'QRE-002',
      name: '现病史缺失',
      checkItem: '现病史是否包含起病情况、主要症状特点、伴随症状、诊疗经过',
      deduction: '扣5分',
      triggerCondition: '现病史缺少起病情况 或 缺少诊疗经过',
      example: {
        correct: '患者3天前无明显诱因出现胸闷...',
        wrong: '患者胸闷3天来诊',
      },
    },
    {
      id: 'QRE-003',
      name: '鉴别诊断不足',
      checkItem: '是否列出至少3个鉴别诊断并逐一分析',
      deduction: '扣3分',
      triggerCondition: '鉴别诊断<3个 或 无分析内容',
      example: {
        correct: '1.急性心肌梗死：需心电图+心肌酶鉴别... 2.肺栓塞... 3.主动脉夹层...',
        wrong: '需要与其他心脏病鉴别',
      },
    },
    {
      id: 'QRE-004',
      name: '用药无指征',
      checkItem: '抗菌药物使用是否有明确指征并记录',
      deduction: '扣5分',
      triggerCondition: '使用抗菌药物但无感染指征记录',
      example: {
        correct: '患者发热38.5℃，WBC 12.5×10^9/L，考虑肺部感染',
        wrong: '予头孢曲松抗感染治疗',
      },
    },
    {
      id: 'QRE-005',
      name: '出院记录不全',
      checkItem: '出院记录是否包含入院诊断、出院诊断、治疗结果、出院医嘱',
      deduction: '扣4分',
      triggerCondition: '缺少出院医嘱 或 缺少治疗结果',
      example: {
        correct: '入院诊断：冠心病；出院诊断：冠心病... 治疗结果：好转... 出院医嘱：...',
        wrong: '患者病情好转出院',
      },
    },
    {
      id: 'QRE-006',
      name: '术前讨论缺失',
      checkItem: '三类以上手术是否有术前讨论记录',
      deduction: '扣5分',
      triggerCondition: '手术分级≥3级 且 无术前讨论记录',
      example: {
        correct: '术前讨论：手术指征明确... 风险评估... 替代方案...',
        wrong: '拟行冠状动脉支架植入术',
      },
    },
  ];

  return json(ok({ rules, totalCount: rules.length }));
}

/** GET /api/v1/emr/version-compare - 病历版本对比 */
async function handleEmrVersionCompare(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const compare = {
    documentId: 'DEMO-NOTE-001',
    documentName: '张演示入院记录',
    versionA: { id: 'V1', time: '2026-10-15 10:30', author: '李医生' },
    versionB: { id: 'V3', time: '2026-10-15 11:00', author: '李医生' },
    differences: {
      added: [
        { section: '现病史', content: '患者3天前无明显诱因出现胸闷，位于心前区，呈压榨样，持续约5分钟，休息后可缓解' },
        { section: '既往史', content: '高血压病史5年，最高160/100mmHg，规律服用缬沙坦' },
      ],
      deleted: [
        { section: '主诉', content: '胸闷3天来诊' },
      ],
      modified: [
        { section: '主诉', oldContent: '胸闷3天来诊', newContent: '胸闷3天，加重伴胸痛6小时' },
        { section: '体格检查', oldContent: '心律齐，无杂音', newContent: '心律齐，心率82次/分，各瓣膜听诊区未闻及病理性杂音' },
      ],
    },
    totalDifferences: 5,
  };

  return json(ok(compare));
}

/** GET /api/v1/emr/modification-history - 病历修改痕迹 */
async function handleEmrModificationHistory(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const history = [
    { id: 'MOD-001', modifier: '李医生', modifyTime: '2026-10-15 10:45', beforeContent: '胸闷3天来诊', afterContent: '胸闷3天，加重伴胸痛6小时', reason: '补充主诉时间细节' },
    { id: 'MOD-002', modifier: '李医生', modifyTime: '2026-10-15 10:50', beforeContent: '心律齐，无杂音', afterContent: '心律齐，心率82次/分，各瓣膜听诊区未闻及病理性杂音', reason: '补充体格检查细节' },
    { id: 'MOD-003', modifier: '王主任', modifyTime: '2026-10-15 11:00', beforeContent: '冠心病待查', afterContent: '冠心病（不稳定型心绞痛）', reason: '上级医师修正诊断' },
    { id: 'MOD-004', modifier: '李医生', modifyTime: '2026-10-15 11:15', beforeContent: '予阿司匹林100mg口服', afterContent: '予阿司匹林肠溶片100mg 每日1次 口服', reason: '完善用法用量' },
    { id: 'MOD-005', modifier: '李医生', modifyTime: '2026-10-15 11:30', beforeContent: '既往体健', afterContent: '高血压病史5年，最高160/100mmHg', reason: '补充既往史' },
  ];

  return json(ok({ history, totalCount: history.length }));
}

/* ==================== 二、互联互通四甲深度 ==================== */

/** GET /api/fhir/Bundle/search - FHIR Bundle 批量搜索 */
async function handleFhirBundleSearch(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const bundle = {
    resourceType: 'Bundle',
    type: 'searchset',
    total: 4,
    entry: [
      { resource: { resourceType: 'Patient', id: 'P001', name: [{ family: '张', given: ['演示'] }], gender: 'male' } },
      { resource: { resourceType: 'Observation', id: 'OBS-001', subject: { reference: 'Patient/P001' }, code: { text: '血压' }, valueQuantity: { value: 130, unit: 'mmHg' } } },
      { resource: { resourceType: 'Condition', id: 'CON-001', subject: { reference: 'Patient/P001' }, code: { text: '冠心病' } } },
      { resource: { resourceType: 'MedicationRequest', id: 'MED-001', subject: { reference: 'Patient/P001' }, medicationCodeableConcept: { text: '阿司匹林' } } },
    ],
  };

  return json(ok(bundle));
}

/** GET /api/fhir/Composition/P001 - FHIR Composition 文档组合 */
async function handleFhirComposition(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const composition = {
    resourceType: 'Composition',
    id: 'COMP-001',
    status: 'final',
    subject: { reference: 'Patient/P001' },
    date: '2026-10-18T14:00:00Z',
    title: '张演示住院病历组合',
    section: [
      { title: '病历首页', entry: [{ reference: 'DocumentReference/DOC-001' }] },
      { title: '诊断信息', entry: [{ reference: 'Condition/CON-001' }] },
      { title: '医嘱记录', entry: [{ reference: 'MedicationRequest/MED-001' }] },
      { title: '检验报告', entry: [{ reference: 'Observation/OBS-001' }] },
      { title: '影像报告', entry: [{ reference: 'DocumentReference/DOC-003' }] },
    ],
  };

  return json(ok(composition));
}

/** GET /api/v1/interoperability/mapping - 互联互通数据映射 */
async function handleInteroperabilityMapping(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const mappings = [
    { id: 'MAP-001', type: '科室编码', localCode: 'NKX', nationalCode: '510100', localName: '心内科', nationalName: '心血管内科' },
    { id: 'MAP-002', type: '诊断编码', localCode: 'GXB', nationalCode: 'I25.101', localName: '冠心病', nationalName: '冠状动脉粥样硬化性心脏病' },
    { id: 'MAP-003', type: '药品编码', localCode: 'ASP-100', nationalCode: '01140100001', localName: '阿司匹林肠溶片', nationalName: '阿司匹林肠溶片' },
    { id: 'MAP-004', type: '检验编码', localCode: '血常规', nationalCode: 'CBC-001', localName: '血常规', nationalName: '血常规（五分类）' },
    { id: 'MAP-005', type: '手术编码', localCode: 'PCI', nationalCode: '36.06001', localName: '冠状动脉支架植入术', nationalName: '经皮冠状动脉支架植入术' },
  ];

  return json(ok({ mappings, totalCount: mappings.length }));
}

/* ==================== 三、BI 数据分析 ==================== */

/** GET /api/v1/bi/trends - 运营趋势分析 */
async function handleBiTrends(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const months = ['2025-11', '2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'];
  const data = months.map((m, i) => ({
    month: m,
    outpatient: 8500 + i * 200 + (i % 3) * 100,
    inpatient: 980 + i * 30 + (i % 2) * 20,
    surgery: 320 + i * 10 + (i % 4) * 5,
    revenue: 2850 + i * 80 + (i % 3) * 30,
    yoyGrowth: 5.2 + i * 0.3,
  }));

  return json(ok({ trends: data, totalCount: data.length }));
}

/** GET /api/v1/bi/comparison - 科室对比分析 */
async function handleBiComparison(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const comparison = [
    { rank: 1, dept: '心内科', outpatient: 8500, discharge: 1250, avgStay: 7.2, avgCost: 18500 },
    { rank: 2, dept: '普外科', outpatient: 6800, discharge: 1560, avgStay: 8.5, avgCost: 22300 },
    { rank: 3, dept: '妇产科', outpatient: 8200, discharge: 1120, avgStay: 6.8, avgCost: 15600 },
    { rank: 4, dept: '呼吸科', outpatient: 7200, discharge: 980, avgStay: 9.2, avgCost: 16800 },
    { rank: 5, dept: '骨科', outpatient: 5600, discharge: 890, avgStay: 10.5, avgCost: 28500 },
    { rank: 6, dept: '神经内科', outpatient: 6500, discharge: 820, avgStay: 11.2, avgCost: 21200 },
    { rank: 7, dept: '内分泌科', outpatient: 7800, discharge: 650, avgStay: 12.5, avgCost: 14500 },
    { rank: 8, dept: '急诊科', outpatient: 12500, discharge: 680, avgStay: 3.5, avgCost: 8500 },
    { rank: 9, dept: '儿科', outpatient: 9500, discharge: 580, avgStay: 5.2, avgCost: 9200 },
    { rank: 10, dept: '消化科', outpatient: 6200, discharge: 760, avgStay: 8.8, avgCost: 13800 },
  ];

  return json(ok({ comparison, totalCount: comparison.length }));
}

export const m214Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/quality-rules-engine', handle: handleEmrQualityRulesEngine, auth: true },
  { method: 'GET', path: '/api/v1/emr/version-compare', handle: handleEmrVersionCompare, auth: true },
  { method: 'GET', path: '/api/v1/emr/modification-history', handle: handleEmrModificationHistory, auth: true },
  { method: 'GET', path: '/api/fhir/Bundle/search', handle: handleFhirBundleSearch, auth: true },
  { method: 'GET', path: '/api/fhir/Composition/P001', handle: handleFhirComposition, auth: true },
  { method: 'GET', path: '/api/v1/interoperability/mapping', handle: handleInteroperabilityMapping, auth: true },
  { method: 'GET', path: '/api/v1/bi/trends', handle: handleBiTrends, auth: true },
  { method: 'GET', path: '/api/v1/bi/comparison', handle: handleBiComparison, auth: true },
];
