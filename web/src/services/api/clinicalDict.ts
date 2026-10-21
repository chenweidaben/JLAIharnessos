/**
 * 健澜科技 jlmedaios - P0 首批临床表单共享字典服务（M521）
 *
 * 患者/就诊队列、科室、药品、诊断下拉数据源：
 *  - 优先走真实 BFF 字典端点（/patients/queue、/dict/dept、/dict/drug、/dict/diagnosis）；
 *  - BFF 不可用或返回空时，返回确定性本地枚举兜底并打标 demo:true；
 *  - 铁律：枚举英文 key 由前端 enum map 映射中文；数值 number、布尔 boolean、日期 ISO8601；
 *    不在页面内裸 fetch，不在页面内 JSON.stringify 错误。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

/* ------------------------------------------------------------------ */
/* 类型定义                                                            */
/* ------------------------------------------------------------------ */

/** 就诊队列选项（Select 远程搜索用，禁止手填 visitId/patientId） */
export interface VisitOption {
  visitId: string;
  patientId: string;
  name: string;
  gender: 'male' | 'female';
  age: number;
  bedNo: string;
  dept: string;
  diagnosis: string;
  diagnosisIcd10?: string;
  demo?: boolean;
}

export interface DeptOption {
  id: string;
  name: string;
  code: string;
  headDoctor: string;
  location: string;
  category: 'clinical' | 'medicalTech' | 'admin';
}

export type MedicationRoute =
  | 'oral'
  | 'iv'
  | 'im'
  | 'subcutaneous'
  | 'inhalation'
  | 'topical'
  | 'rectal';

export interface DrugOption {
  id: string;
  genericName: string;
  cnName: string;
  spec: string;
  unit: string;
  dosageRange: string;
  route: MedicationRoute;
  insuranceCategory: 'jia' | 'yi' | 'selfPay';
  antibioticLevel: 'non' | 'nonRestricted' | 'restricted' | 'special';
  contraindications: string[];
}

export interface DiagnosisOption {
  id: string;
  name: string;
  icd10: string;
  diseasePath: string;
  category: 'internal' | 'surgery' | 'obgyn' | 'pediatrics' | 'other';
}

export interface DictResult<T> {
  data: T[];
  demo: boolean;
}

/* ------------------------------------------------------------------ */
/* 枚举字典（前端 enum map，禁止把英文 key 裸显给医生）                  */
/* ------------------------------------------------------------------ */

export const GENDER_LABEL: Record<VisitOption['gender'], string> = {
  male: '男',
  female: '女',
};

export const GENDER_COLOR: Record<VisitOption['gender'], string> = {
  male: 'blue',
  female: 'pink',
};

export const ROUTE_LABEL: Record<MedicationRoute, string> = {
  oral: '口服',
  iv: '静脉注射',
  im: '肌内注射',
  subcutaneous: '皮下注射',
  inhalation: '雾化吸入',
  topical: '外用',
  rectal: '直肠给药',
};

export const INSURANCE_LABEL: Record<DrugOption['insuranceCategory'], string> = {
  jia: '甲类',
  yi: '乙类',
  selfPay: '自费',
};

/** 后端药品 genericName(EN) → 中文通用名本地兜底映射（M522 字典补强 cnName 后改走字典） */
const DRUG_CN: Record<string, string> = {
  'Ceftriaxone Sodium': '注射用头孢曲松钠',
  'Metformin Hydrochloride': '盐酸二甲双胍片',
  'Amoxicillin Capsules': '阿莫西林胶囊',
  'Lidocaine Injection': '盐酸利多卡因注射液',
  'Budesonide Nebulizer Suspension': '布地奈德雾化混悬液',
  Enoxaparin: '依诺肝素钠注射液',
  Warfarin: '华法林钠片',
  Rivaroxaban: '利伐沙班片',
};

/* ------------------------------------------------------------------ */
/* 确定性本地兜底数据（BFF 不可用时使用，全部打 demo:true）             */
/* ------------------------------------------------------------------ */

const DEMO_VISITS: VisitOption[] = [
  {
    visitId: '00000000-0000-4000-8000-000000000001',
    patientId: 'P-DEMO-001',
    name: '张建国',
    gender: 'male',
    age: 64,
    bedNo: '一病区 12 床',
    dept: '普外科',
    diagnosis: '急性阑尾炎',
    diagnosisIcd10: 'K35.9',
    demo: true,
  },
  {
    visitId: '00000000-0000-4000-8000-000000000002',
    patientId: 'P-DEMO-002',
    name: '李秀兰',
    gender: 'female',
    age: 58,
    bedNo: '心内科 06 床',
    dept: '心血管内科',
    diagnosis: '原发性高血压',
    diagnosisIcd10: 'I10.9',
    demo: true,
  },
  {
    visitId: '00000000-0000-4000-8000-000000000003',
    patientId: 'P-DEMO-003',
    name: '王卫国',
    gender: 'male',
    age: 72,
    bedNo: '普外科 03 床',
    dept: '普外科',
    diagnosis: '下肢深静脉血栓',
    diagnosisIcd10: 'I82.2',
    demo: true,
  },
  {
    visitId: '00000000-0000-4000-8000-000000000004',
    patientId: 'P-DEMO-004',
    name: '赵敏',
    gender: 'female',
    age: 35,
    bedNo: '产科 08 床',
    dept: '产科',
    diagnosis: '剖宫产（单胎活产）',
    diagnosisIcd10: 'O82.0',
    demo: true,
  },
  {
    visitId: '00000000-0000-4000-8000-000000000005',
    patientId: 'P-DEMO-005',
    name: '陈德荣',
    gender: 'male',
    age: 69,
    bedNo: '骨科 15 床',
    dept: '骨科',
    diagnosis: '髋部骨折',
    diagnosisIcd10: 'S72.0',
    demo: true,
  },
];

const DEMO_DEPTS: DeptOption[] = [
  { id: 'DEPT-001', name: '心血管内科', code: 'CARD', headDoctor: '王建国', location: '门诊楼 3 层东区', category: 'clinical' },
  { id: 'DEPT-002', name: '普外科', code: 'GENS', headDoctor: '李卫国', location: '门诊楼 4 层西区', category: 'clinical' },
  { id: 'DEPT-003', name: '骨科', code: 'ORTH', headDoctor: '赵骨伤', location: '住院部 2 层', category: 'clinical' },
  { id: 'DEPT-004', name: '妇产科', code: 'OBGY', headDoctor: '孙产科', location: '住院部 4 层', category: 'clinical' },
  { id: 'DEPT-005', name: '麻醉科', code: 'ANES', headDoctor: '周麻醉', location: '手术部 1 层', category: 'clinical' },
  { id: 'DEPT-006', name: '放射科', code: 'RADI', headDoctor: '张放射', location: '医技楼 1 层', category: 'medicalTech' },
  { id: 'DEPT-007', name: '检验科', code: 'LAB', headDoctor: '陈检验', location: '医技楼 2 层', category: 'medicalTech' },
  { id: 'DEPT-008', name: '营养科', code: 'NUTR', headDoctor: '吴营养', location: '门诊楼 2 层', category: 'clinical' },
];

const DEMO_DRUGS: DrugOption[] = [
  {
    id: 'DRUG-ENOX',
    genericName: 'Enoxaparin',
    cnName: '依诺肝素钠注射液',
    spec: '4000IU/0.4ml',
    unit: '支',
    dosageRange: '4000IU/次，1次/日',
    route: 'subcutaneous',
    insuranceCategory: 'jia',
    antibioticLevel: 'non',
    contraindications: ['active_bleeding', 'thrombocytopenia', 'recent_intracranial_hemorrhage'],
  },
  {
    id: 'DRUG-WAR',
    genericName: 'Warfarin',
    cnName: '华法林钠片',
    spec: '2.5mg/片',
    unit: '片',
    dosageRange: '2.5-5mg/次，1次/日（按 INR 调量）',
    route: 'oral',
    insuranceCategory: 'jia',
    antibioticLevel: 'non',
    contraindications: ['active_bleeding', 'pregnancy', 'severe_liver_disease'],
  },
  {
    id: 'DRUG-RIV',
    genericName: 'Rivaroxaban',
    cnName: '利伐沙班片',
    spec: '10mg/片',
    unit: '片',
    dosageRange: '10mg/次，1次/日',
    route: 'oral',
    insuranceCategory: 'yi',
    antibioticLevel: 'non',
    contraindications: ['active_bleeding', 'severe_renal_failure', 'liver_cirrhosis'],
  },
  {
    id: 'DRUG-001',
    genericName: 'Ceftriaxone Sodium',
    cnName: '注射用头孢曲松钠',
    spec: '1g/支',
    unit: '支',
    dosageRange: '1-2g/次，1-2次/日',
    route: 'iv',
    insuranceCategory: 'jia',
    antibioticLevel: 'restricted',
    contraindications: ['ceftriaxone_allergy', 'jaundice_infants'],
  },
  {
    id: 'DRUG-002',
    genericName: 'Metformin Hydrochloride',
    cnName: '盐酸二甲双胍片',
    spec: '0.5g/片',
    unit: '片',
    dosageRange: '0.5g/次，2-3次/日',
    route: 'oral',
    insuranceCategory: 'jia',
    antibioticLevel: 'non',
    contraindications: ['renal_failure', 'metabolic_acidosis'],
  },
];

const DEMO_DIAGNOSES: DiagnosisOption[] = [
  { id: 'DIAG-001', name: '急性 ST 段抬高型心肌梗死', icd10: 'I21.0', diseasePath: 'cardiology/acute-stemi', category: 'internal' },
  { id: 'DIAG-002', name: '急性阑尾炎', icd10: 'K35.9', diseasePath: 'surgery/appendicitis', category: 'surgery' },
  { id: 'DIAG-003', name: '原发性高血压', icd10: 'I10.9', diseasePath: 'cardiology/hypertension', category: 'internal' },
  { id: 'DIAG-004', name: '剖宫产（单胎活产）', icd10: 'O82.0', diseasePath: 'obgyn/cesarean', category: 'obgyn' },
  { id: 'DIAG-005', name: '髋部骨折', icd10: 'S72.0', diseasePath: 'orthopedics/hip-fracture', category: 'surgery' },
  { id: 'DIAG-006', name: '下肢深静脉血栓', icd10: 'I82.2', diseasePath: 'vascular/dvt', category: 'internal' },
];

/* ------------------------------------------------------------------ */
/* 拉取辅助                                                            */
/* ------------------------------------------------------------------ */

function matchesKeyword(name: string, keyword: string): boolean {
  if (!keyword.trim()) return true;
  return name.toLowerCase().includes(keyword.trim().toLowerCase());
}

/** 患者/就诊队列远程搜索（后端第四节配套端点 /patients/queue；未就绪时本地兜底） */
export async function searchVisits(keyword: string): Promise<DictResult<VisitOption>> {
  try {
    const res = await get<{ items?: VisitOption[] } | VisitOption[]>('/patients/queue', { keyword });
    const items = Array.isArray(res) ? res : ((res as { items?: VisitOption[] })?.items ?? []);
    if (items.length > 0) return { data: items, demo: false };
    return { data: DEMO_VISITS.filter((v) => matchesKeyword(`${v.name} ${v.dept} ${v.diagnosis}`, keyword)), demo: true };
  } catch {
    return { data: DEMO_VISITS.filter((v) => matchesKeyword(`${v.name} ${v.dept} ${v.diagnosis}`, keyword)), demo: true };
  }
}

/** 科室字典（M522 /dict/dept） */
export async function fetchDeptDict(): Promise<DictResult<DeptOption>> {
  try {
    const res = await get<{ items?: DeptOption[] }>('/dict/dept');
    const items = res?.items ?? [];
    if (items.length > 0) return { data: items, demo: false };
    return { data: DEMO_DEPTS, demo: true };
  } catch {
    return { data: DEMO_DEPTS, demo: true };
  }
}

/** 药品字典（M522 /dict/drug；后端未补 cnName 时前端本地补中文通用名） */
export async function fetchDrugDict(): Promise<DictResult<DrugOption>> {
  try {
    const res = await get<{ items?: Array<Omit<DrugOption, 'cnName'>> }>('/dict/drug');
    const items = (res?.items ?? []).map((d) => ({ ...d, cnName: DRUG_CN[d.genericName] ?? d.genericName }));
    if (items.length > 0) return { data: items, demo: false };
    return { data: DEMO_DRUGS, demo: true };
  } catch {
    return { data: DEMO_DRUGS, demo: true };
  }
}

/** 诊断字典（M522 /dict/diagnosis，联动 ICD-10 与病种路径） */
export async function fetchDiagnosisDict(): Promise<DictResult<DiagnosisOption>> {
  try {
    const res = await get<{ items?: DiagnosisOption[] }>('/dict/diagnosis');
    const items = res?.items ?? [];
    if (items.length > 0) return { data: items, demo: false };
    return { data: DEMO_DIAGNOSES, demo: true };
  } catch {
    return { data: DEMO_DIAGNOSES, demo: true };
  }
}
