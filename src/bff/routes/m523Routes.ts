/**
 * 健澜科技 jlmedaios - M523 新标准 P0：字典数据源第二批 3 端点
 *
 * dict/procedure 术式字典（ICD-9-CM3 + 术前必查联动）、dict/blood-type 血型字典、dict/test-item 检验项目字典（单位+参考区间联动）。
 * 走 dict/ 新前缀；与 M522 /dict/dept|drug|diagnosis 同域第二批；与 M521 /emergency/*、M520 /radiation/*、/outpatient/* 路由区分。
 *
 * 后端数据契约铁律：枚举英文 key（中文标签前端 enum map 映射）、数值 number、布尔 boolean、日期 ISO8601；禁止中文标签拼字符串。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/dict/procedure - 术式字典（surgeryLevel 英文枚举，preCheckItems 数组，ICD-9-CM3 联动编码）5 条 */
async function handleDictProcedure(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    {
      id: 'PROC-001',
      name: '腹腔镜胆囊切除术',
      icd9cm3: '51.23',
      surgeryLevel: 'level3' as const,
      preCheckItems: ['blood_routine', 'coagulation', 'liver_function', 'chest_xray'],
      dept: '普外科',
    },
    {
      id: 'PROC-002',
      name: '冠状动脉旁路移植术',
      icd9cm3: '36.10',
      surgeryLevel: 'level4' as const,
      preCheckItems: ['blood_routine', 'coagulation', 'liver_function', 'renal_function', 'cardiac_enzyme', 'chest_xray', 'echocardiography'],
      dept: '心外科',
    },
    {
      id: 'PROC-003',
      name: '腹股沟疝修补术',
      icd9cm3: '53.00',
      surgeryLevel: 'level2' as const,
      preCheckItems: ['blood_routine', 'coagulation', 'chest_xray'],
      dept: '普外科',
    },
    {
      id: 'PROC-004',
      name: '白内障超声乳化摘除联合人工晶体植入术',
      icd9cm3: '13.41',
      surgeryLevel: 'level1' as const,
      preCheckItems: ['blood_routine', 'coagulation', 'glucose'],
      dept: '眼科',
    },
    {
      id: 'PROC-005',
      name: '全髋关节置换术',
      icd9cm3: '81.51',
      surgeryLevel: 'level3' as const,
      preCheckItems: ['blood_routine', 'coagulation', 'liver_function', 'renal_function', 'chest_xray', 'ecg'],
      dept: '骨科',
    },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/dict/blood-type - 血型字典（abo/rh 英文枚举，frequency number，按中国人群真实分布）5 条 */
async function handleDictBloodType(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'BT-001', abo: 'O' as const, rh: 'positive' as const, frequency: 0.2991 },
    { id: 'BT-002', abo: 'A' as const, rh: 'positive' as const, frequency: 0.2792 },
    { id: 'BT-003', abo: 'B' as const, rh: 'positive' as const, frequency: 0.2393 },
    { id: 'BT-004', abo: 'AB' as const, rh: 'positive' as const, frequency: 0.0797 },
    { id: 'BT-005', abo: 'O' as const, rh: 'negative' as const, frequency: 0.0009 },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/dict/test-item - 检验项目字典（specimen 英文枚举，refLow/refHigh number|null 联动参考区间）5 条 */
async function handleDictTestItem(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TEST-001', name: '白细胞计数', unit: '×10^9/L', refLow: 3.5, refHigh: 9.5, specimen: 'blood' as const, department: '检验科' },
    { id: 'TEST-002', name: '血红蛋白', unit: 'g/L', refLow: 115, refHigh: 150, specimen: 'blood' as const, department: '检验科' },
    { id: 'TEST-003', name: '尿比重', unit: '', refLow: 1.003, refHigh: 1.030, specimen: 'urine' as const, department: '检验科' },
    { id: 'TEST-004', name: '总胆红素', unit: 'μmol/L', refLow: 3.4, refHigh: 20.5, specimen: 'serum' as const, department: '检验科' },
    { id: 'TEST-005', name: '痰涂片革兰染色', unit: '', refLow: null, refHigh: null, specimen: 'sputum' as const, department: '微生物室' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m523Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/dict/procedure', handle: handleDictProcedure, auth: true },
  { method: 'GET', path: '/api/v1/dict/blood-type', handle: handleDictBloodType, auth: true },
  { method: 'GET', path: '/api/v1/dict/test-item', handle: handleDictTestItem, auth: true },
];
