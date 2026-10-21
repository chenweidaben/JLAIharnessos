/**
 * 健澜科技 jlmedaios - M527 新标准 P0：存量字典补强 v2（独立新文件，禁止改 m522/m523 已提交文件）3 端点
 *
 * dict/dept-v2 科室字典补强、dict/drug-v2 药品字典补强（结构化剂量）、dict/diagnosis-v2 诊断字典补强（ICD-10 + 病种路径 + 建议科室联动）。
 * v2 路径与 m522/m523 旧路径并存不冲突；与 M526 /patient/queue、/dict/scales、/dict/scale/*、M525 /nursing-care/*、M524 /order/*、/outpatient/* 路由区分。
 *
 * 字段铁律：枚举英文 key；数值 number；布尔 boolean；日期 ISO8601；禁止 undefined/NaN；
 * 中文只出现在 cnName/label 等展示字段，枚举 code 必须英文。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/dict/dept-v2 - 科室字典补强（category 英文枚举，wardCodes 数组，code 与 M526 队列 deptCode 对齐）5 条 */
async function handleDictDeptV2(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DEPT2-001', code: 'CARD', cnName: '心血管内科', category: 'clinical' as const, headDoctor: '王建国', location: '门诊楼 3 层东区', wardCodes: ['CARD-W1', 'CARD-W2'] },
    { id: 'DEPT2-002', code: 'SURG', cnName: '普外科', category: 'clinical' as const, headDoctor: '李卫国', location: '门诊楼 4 层西区', wardCodes: ['SURG-W1', 'SURG-W2'] },
    { id: 'DEPT2-003', code: 'LAB', cnName: '检验科', category: 'medicalTech' as const, headDoctor: '陈检验', location: '医技楼 2 层', wardCodes: [] },
    { id: 'DEPT2-004', code: 'RAD', cnName: '放射科', category: 'medicalTech' as const, headDoctor: '张放射', location: '医技楼 1 层', wardCodes: [] },
    { id: 'DEPT2-005', code: 'ADMIN-MO', cnName: '医务部', category: 'admin' as const, headDoctor: '刘管理', location: '行政楼 5 层', wardCodes: [] },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/dict/drug-v2 - 药品字典补强（minDose/maxDose number，frequency/route/insuranceCategory/antibioticLevel 英文枚举，禁忌英文 key 数组）5 条 */
async function handleDictDrugV2(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    // 抗菌药 1：限制使用级
    {
      id: 'DRUG2-001',
      genericName: 'Ceftriaxone Sodium',
      cnName: '注射用头孢曲松钠',
      spec: '1g/支',
      unit: 'vial',
      minDose: 1,
      maxDose: 2,
      doseUnit: 'g',
      frequency: 'q12h' as const,
      route: 'iv' as const,
      insuranceCategory: 'jia' as const,
      antibioticLevel: 'restricted' as const,
      contraindications: ['ceftriaxone_allergy', 'jaundice_infants', 'hyperbilirubinemia_neonates'],
    },
    // 抗菌药 2：特殊使用级
    {
      id: 'DRUG2-002',
      genericName: 'Vancomycin Hydrochloride',
      cnName: '注射用盐酸万古霉素',
      spec: '0.5g/支',
      unit: 'vial',
      minDose: 0.5,
      maxDose: 1,
      doseUnit: 'g',
      frequency: 'q8h' as const,
      route: 'iv' as const,
      insuranceCategory: 'yi' as const,
      antibioticLevel: 'special' as const,
      contraindications: ['vancomycin_allergy', 'renal_impairment_caution', 'hearing_impairment_caution'],
    },
    // 抗凝药
    {
      id: 'DRUG2-003',
      genericName: 'Enoxaparin Sodium Injection',
      cnName: '依诺肝素钠注射液',
      spec: '4000IU/0.4ml',
      unit: 'ampoule',
      minDose: 20,
      maxDose: 40,
      doseUnit: 'mg',
      frequency: 'q12h' as const,
      route: 'sc' as const,
      insuranceCategory: 'yi' as const,
      antibioticLevel: 'non' as const,
      contraindications: ['active_bleeding', 'heparin_induced_thrombocytopenia', 'severe_renal_failure'],
    },
    // 降压药
    {
      id: 'DRUG2-004',
      genericName: 'Amlodipine Besylate Tablets',
      cnName: '苯磺酸氨氯地平片',
      spec: '5mg/片',
      unit: 'tablet',
      minDose: 2.5,
      maxDose: 10,
      doseUnit: 'mg',
      frequency: 'qd' as const,
      route: 'oral' as const,
      insuranceCategory: 'jia' as const,
      antibioticLevel: 'non' as const,
      contraindications: ['amlodipine_allergy', 'severe_hypotension', 'aortic_stenosis'],
    },
    // 降糖药
    {
      id: 'DRUG2-005',
      genericName: 'Metformin Hydrochloride Tablets',
      cnName: '盐酸二甲双胍片',
      spec: '0.5g/片',
      unit: 'tablet',
      minDose: 0.5,
      maxDose: 1,
      doseUnit: 'g',
      frequency: 'bid' as const,
      route: 'oral' as const,
      insuranceCategory: 'jia' as const,
      antibioticLevel: 'non' as const,
      contraindications: ['renal_failure', 'metabolic_acidosis', 'lactic_acidosis_history'],
    },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/dict/diagnosis-v2 - 诊断字典补强（ICD-10 真实编码 + kebab-case 病种路径 + 建议科室 code 联动，category 英文枚举）5 条 */
async function handleDictDiagnosisV2(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'DIAG2-001', code: 'DX-I21.0', cnName: '急性 ST 段抬高型心肌梗死', icd10: 'I21.0', diseasePath: 'cardiology/acute-stemi', recommendedDeptCode: 'CARD', category: 'internal' as const },
    { id: 'DIAG2-002', code: 'DX-K35.9', cnName: '急性阑尾炎', icd10: 'K35.9', diseasePath: 'surgery/acute-appendicitis', recommendedDeptCode: 'SURG', category: 'surgery' as const },
    { id: 'DIAG2-003', code: 'DX-O80.0', cnName: '足月单胎顺产', icd10: 'O80.0', diseasePath: 'obgyn/spontaneous-vertex-delivery', recommendedDeptCode: 'OBGYN', category: 'obgyn' as const },
    { id: 'DIAG2-004', code: 'DX-J18.9', cnName: '肺炎未特指病原体', icd10: 'J18.9', diseasePath: 'pediatrics/community-pneumonia', recommendedDeptCode: 'PEDIA', category: 'pediatrics' as const },
    { id: 'DIAG2-005', code: 'DX-S72.001', cnName: '股骨颈骨折', icd10: 'S72.001', diseasePath: 'emergency/hip-fracture-trauma', recommendedDeptCode: 'EMERG', category: 'emergency' as const },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m527Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/dict/dept-v2', handle: handleDictDeptV2, auth: true },
  { method: 'GET', path: '/api/v1/dict/drug-v2', handle: handleDictDrugV2, auth: true },
  { method: 'GET', path: '/api/v1/dict/diagnosis-v2', handle: handleDictDiagnosisV2, auth: true },
];
