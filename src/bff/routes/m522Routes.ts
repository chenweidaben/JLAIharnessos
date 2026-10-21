/**
 * 健澜科技 jlmedaios - M522 新标准 P0：字典与下拉数据源 3 端点
 *
 * dict/dept 科室字典、dict/drug 药品字典（联动带出规格/剂量/单位/途径/禁忌）、dict/diagnosis 诊断字典（ICD-10 + 病种路径联动）。
 * 走 dict/ 新前缀；与 M521 /emergency/*、M520 /radiation/*、M519 /transfusion/*、/outpatient/* 路由区分。
 *
 * 后端数据契约铁律：枚举/状态/类型返回英文 key，中文标签由前端 enum map 映射；数值 number、布尔 boolean、日期 ISO8601；
 * 禁止把整句中文标签塞进字段；联动项（药品带出规格/剂量/单位/途径/禁忌；诊断带出 ICD/路径；科室带出主任医生）随字典一并返回。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/dict/dept - 科室字典（category 英文枚举，联动带出主任医生/位置）5 条 */
async function handleDictDept(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DEPT-001', name: '心血管内科', code: 'CARD', category: 'clinical' as const, headDoctor: '王建国', location: '门诊楼 3 层东区' },
    { id: 'DEPT-002', name: '普外科', code: 'GENS', category: 'clinical' as const, headDoctor: '李卫国', location: '门诊楼 4 层西区' },
    { id: 'DEPT-003', name: '放射科', code: 'RADI', category: 'medicalTech' as const, headDoctor: '张放射', location: '医技楼 1 层' },
    { id: 'DEPT-004', name: '检验科', code: 'LAB', category: 'medicalTech' as const, headDoctor: '陈检验', location: '医技楼 2 层' },
    { id: 'DEPT-005', name: '医务部', code: 'ADMIN-MO', category: 'admin' as const, headDoctor: '刘管理', location: '行政楼 5 层' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/dict/drug - 药品字典（route/insuranceCategory/antibioticLevel 英文枚举，contraindications 数组）5 条 */
async function handleDictDrug(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    {
      id: 'DRUG-001',
      genericName: 'Ceftriaxone Sodium',
      spec: '1g/支',
      unit: 'vial',
      dosageRange: '1-2g/次，1-2次/日',
      route: 'iv' as const,
      insuranceCategory: 'jia' as const,
      antibioticLevel: 'restricted' as const,
      contraindications: ['ceftriaxone_allergy', 'jaundice_infants'],
    },
    {
      id: 'DRUG-002',
      genericName: 'Metformin Hydrochloride',
      spec: '0.5g/片',
      unit: 'tablet',
      dosageRange: '0.5g/次，2-3次/日',
      route: 'oral' as const,
      insuranceCategory: 'jia' as const,
      antibioticLevel: 'non' as const,
      contraindications: ['renal_failure', 'metabolic_acidosis'],
    },
    {
      id: 'DRUG-003',
      genericName: 'Amoxicillin Capsules',
      spec: '0.25g/粒',
      unit: 'capsule',
      dosageRange: '0.5g/次，3次/日',
      route: 'oral' as const,
      insuranceCategory: 'yi' as const,
      antibioticLevel: 'non' as const,
      contraindications: ['penicillin_allergy'],
    },
    {
      id: 'DRUG-004',
      genericName: 'Lidocaine Injection',
      spec: '0.1g/5ml',
      unit: 'vial',
      dosageRange: '按局麻需要量',
      route: 'im' as const,
      insuranceCategory: 'jia' as const,
      antibioticLevel: 'non' as const,
      contraindications: ['lidocaine_allergy', 'heart_block'],
    },
    {
      id: 'DRUG-005',
      genericName: 'Budesonide Nebulizer Suspension',
      spec: '0.5mg/2ml',
      unit: 'ampoule',
      dosageRange: '0.5-1mg/次，2次/日',
      route: 'inhalation' as const,
      insuranceCategory: 'selfPay' as const,
      antibioticLevel: 'non' as const,
      contraindications: ['budesonide_allergy'],
    },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/dict/diagnosis - 诊断字典（icd10 联动编码，diseasePath 病种路径，category 英文枚举）5 条 */
async function handleDictDiagnosis(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DIAG-001', name: '急性 ST 段抬高型心肌梗死', icd10: 'I21.0', diseasePath: 'cardiology/acute-stemi', category: 'internal' as const },
    { id: 'DIAG-002', name: '急性阑尾炎', icd10: 'K35.9', diseasePath: 'surgery/appendicitis', category: 'surgery' as const },
    { id: 'DIAG-003', name: '原发性高血压', icd10: 'I10.9', diseasePath: 'cardiology/hypertension', category: 'internal' as const },
    { id: 'DIAG-004', name: '剖宫产（单胎活产）', icd10: 'O82.0', diseasePath: 'obgyn/cesarean', category: 'obgyn' as const },
    { id: 'DIAG-005', name: '小儿急性支气管炎', icd10: 'J20.9', diseasePath: 'pediatrics/bronchitis', category: 'pediatrics' as const },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m522Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/dict/dept', handle: handleDictDept, auth: true },
  { method: 'GET', path: '/api/v1/dict/drug', handle: handleDictDrug, auth: true },
  { method: 'GET', path: '/api/v1/dict/diagnosis', handle: handleDictDiagnosis, auth: true },
];
