/**
 * 健澜科技 jlmedaios - M125-B 演示数据生成器（纯函数）
 *
 * 「演示就绪」：一键生成完整、自洽、外键一致的院内演示数据集，用于
 *  —— 本地 / 演示环境零依赖起库前的前端与 BFF 联调；
 *  —— 评测、截图、Demo 录屏时的确定性（可复现）样本；
 *  —— 单元测试中对聚合器 / 页面的固定夹具（fixture）。
 *
 * 设计约束：
 *  1. 全部为无副作用纯函数：相同 seed 必然产出完全相同的数据；
 *  2. 不触碰数据库、WebSocket、网络与任何 IO；
 *  3. 所有外键（deptId / doctorId / patientId / visitId / staffId）均指向已生成的实体；
 *  4. 数据量与本文件顶部的 COUNT_* 常量一一对应，测试直接引用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 数据量常量 ============================== */

/** 科室数量 */
export const COUNT_DEPARTMENTS = 10;
/** 医生数量 */
export const COUNT_DOCTORS = 50;
/** 护士数量 */
export const COUNT_NURSES = 100;
/** 药师数量 */
export const COUNT_PHARMACISTS = 10;
/** 管理员数量 */
export const COUNT_ADMINS = 5;
/** 患者数量 */
export const COUNT_PATIENTS = 1000;
/** 就诊记录数量 */
export const COUNT_VISITS = 3000;
/** 处方数量 */
export const COUNT_PRESCRIPTIONS = 2000;
/** 住院记录数量 */
export const COUNT_ADMISSIONS = 500;
/** 员工经验记忆（Staff Decision Memory）数量 */
export const COUNT_STAFF_MEMORIES = 5000;
/** 患者反馈数量 */
export const COUNT_PATIENT_FEEDBACKS = 500;

/** 默认随机种子：保证「演示就绪」开箱即得同一份数据 */
export const DEFAULT_SEED = 20261016;

/* ============================== 实体类型 ============================== */

/** 科室 */
export interface Department {
  /** 科室编号，如 'DEPT01' */
  id: string;
  /** 科室名称，如 '心内科' */
  name: string;
  /** 科室编码（HIS 对齐），如 'XNK' */
  code: string;
}

export type Gender = 'M' | 'F';
export type StaffRole = 'doctor' | 'nurse' | 'pharmacist' | 'admin';

/** 员工（医生 / 护士 / 药师 / 管理员统一视图） */
export interface Staff {
  /** 工号，如 'D1001'（D=医生 N=护士 P=药师 A=管理员） */
  id: string;
  name: string;
  role: StaffRole;
  /** 所属科室，外键 -> Department.id */
  deptId: string;
  /** 职称：主任医师 / 副主任医师 / 主治医师 / 住院医师 / 主任护师 … */
  title: string;
  gender: Gender;
}

/** 患者 */
export interface Patient {
  /** 病案号，如 'P0001' */
  id: string;
  name: string;
  gender: Gender;
  age: number;
  /** 常就诊科室，外键 -> Department.id（可为空） */
  preferredDeptId: string | null;
}

export type VisitType = 'outpatient' | 'emergency' | 'inpatient';

/** 就诊记录（门诊 / 急诊 / 住院） */
export interface VisitRecord {
  /** 就诊号，如 'V000001' */
  id: string;
  /** 外键 -> Patient.id */
  patientId: string;
  /** 外键 -> Staff.id（role=doctor） */
  doctorId: string;
  /** 外键 -> Department.id */
  deptId: string;
  visitType: VisitType;
  /** ICD-10 风格诊断名称 */
  diagnosis: string;
  /** 就诊时间（ISO 8601） */
  visitedAt: string;
}

/** 处方 */
export interface Prescription {
  /** 处方号，如 'RX000001' */
  id: string;
  /** 外键 -> VisitRecord.id（处方必挂在一次就诊下） */
  visitId: string;
  /** 外键 -> Patient.id（冗余便于联表） */
  patientId: string;
  /** 外键 -> Staff.id（role=doctor） */
  doctorId: string;
  drugName: string;
  dosage: string;
  quantity: number;
  prescribedAt: string;
}

/** 住院记录 */
export interface Admission {
  /** 住院号，如 'ADM00001' */
  id: string;
  /** 外键 -> Patient.id */
  patientId: string;
  /** 外键 -> Staff.id（role=doctor，管床医生） */
  doctorId: string;
  /** 外键 -> Department.id */
  deptId: string;
  ward: string;
  bedNo: string;
  admittedAt: string;
  /** 离院时间；null 表示在院 */
  dischargedAt: string | null;
}

export type MemoryOutcome = 'positive' | 'negative' | 'neutral';

/** 员工经验记忆（Staff Decision Memory）—— MedMuse 经验沉淀 */
export interface StaffDecisionMemory {
  /** 记忆编号，如 'MEM000001' */
  id: string;
  /** 外键 -> Staff.id（任意角色：医生 / 护士 / 药师） */
  staffId: string;
  /** 外键 -> Department.id */
  deptId: string;
  /** 场景描述，如 '老年高血压合并糖尿病用药' */
  scenario: string;
  /** 当时做出的决策与依据 */
  decision: string;
  outcome: MemoryOutcome;
  createdAt: string;
}

/** 患者反馈 */
export interface PatientFeedback {
  /** 反馈编号，如 'FB000001' */
  id: string;
  /** 外键 -> Patient.id */
  patientId: string;
  /** 外键 -> Staff.id（被评价的员工） */
  staffId: string;
  /** 满意度评分 1~5 */
  score: number;
  comment: string;
  createdAt: string;
}

/** 完整演示数据集 */
export interface DemoData {
  departments: Department[];
  doctors: Staff[];
  nurses: Staff[];
  pharmacists: Staff[];
  admins: Staff[];
  patients: Patient[];
  visits: VisitRecord[];
  prescriptions: Prescription[];
  admissions: Admission[];
  staffDecisionMemories: StaffDecisionMemory[];
  patientFeedbacks: PatientFeedback[];
  /** 数据生成时间（ISO） */
  generatedAt: string;
}

/* ============================== 确定性随机数 ============================== */

/** mulberry32：短小、跨平台结果一致的伪随机数发生器 */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ============================== 词料池 ============================== */

const DEPARTMENT_POOL: Array<[string, string]> = [
  ['心内科', 'XNK'],
  ['呼吸内科', 'HXNK'],
  ['消化内科', 'XHNK'],
  ['神经内科', 'SJNK'],
  ['普外科', 'PWK'],
  ['骨科', 'GK'],
  ['妇产科', 'FCK'],
  ['儿科', 'EK'],
  ['急诊科', 'JZK'],
  ['药剂科', 'YJK'],
];

const SURNAMES = ['王', '李', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗'];
const GIVEN_M = ['伟', '强', '磊', '军', '勇', '杰', '涛', '明', '超', '刚', '建国', '志远', '文博', '子轩', '浩然'];
const GIVEN_F = ['芳', '娟', '敏', '静', '丽', '艳', '娜', '秀英', '雪', '婷', '欣怡', '梓涵', '雨桐', '若曦', '梦琪'];

const DOCTOR_TITLES = ['主任医师', '副主任医师', '主治医师', '住院医师'];
const NURSE_TITLES = ['主任护师', '副主任护师', '主管护师', '护师'];
const PHARMACIST_TITLES = ['主任药师', '副主任药师', '主管药师', '药师'];
const ADMIN_TITLES = ['科长', '主任', '主管', '专员'];

const DIAGNOSES = [
  '高血压病 2 级',
  '2 型糖尿病',
  '社区获得性肺炎',
  '急性上呼吸道感染',
  '慢性胃炎',
  '腰椎间盘突出',
  '急性阑尾炎（术后）',
  '脑梗死恢复期',
  '冠状动脉粥样硬化性心脏病',
  '急性胃肠炎',
  '支气管哮喘',
  '功能性消化不良',
  '缺铁性贫血',
  '湿疹',
  '偏头痛',
];

const DRUGS: Array<[string, string]> = [
  ['硝苯地平控释片', '30mg qd'],
  ['二甲双胍缓释片', '0.5g bid'],
  ['阿莫西林胶囊', '0.5g tid'],
  ['氨溴索口服溶液', '10ml tid'],
  ['奥美拉唑肠溶胶囊', '20mg qd'],
  ['布洛芬缓释胶囊', '0.3g bid'],
  ['阿托伐他汀钙片', '20mg qn'],
  ['阿司匹林肠溶片', '100mg qd'],
  ['孟鲁司特钠片', '10mg qn'],
  ['双歧杆菌三联活菌胶囊', '2粒 tid'],
];

const MEMORY_SCENARIOS = [
  '老年多重用药相互作用',
  '围术期抗凝管理',
  '急诊胸痛鉴别诊断',
  '糖尿病足护理评估',
  '抗菌药物遴选与降阶梯',
  '儿童发热物理降温',
  '化疗致吐预处理',
  '院内跌倒高风险患者识别',
  '肠内营养启动时机',
  '出院带药依从性随访',
];

const MEMORY_DECISIONS = [
  '优先停用相互作用风险最高的药物并监测血药浓度',
  '维持原方案，3 天后复查指标再评估',
  '升级为一线指南推荐方案并告知患者风险',
  '暂缓操作，提请多学科会诊',
  '加强宣教并纳入随访名单',
];

const FEEDBACK_COMMENTS = [
  '医生讲解很耐心，就医体验好',
  '护士扎针技术好，态度亲切',
  '等待时间略长，但整体满意',
  '药师用药交代清楚',
  '病房环境整洁',
  '希望增加自助机数量',
  '出院指导详细',
  '急诊响应迅速',
];

/* ============================== 工具 ============================== */

const pad = (n: number, width: number): string => String(n).padStart(width, '0');

/** 把 [0,1) 随机数映射到数组下标 */
function pickIdx(rng: () => number, len: number): number {
  return Math.floor(rng() * len);
}

function pick<T>(rng: () => number, arr: readonly T[]): T {
  return arr[pickIdx(rng, arr.length)];
}

/** 生成最近 N 天内的随机时间（ISO），保证时间线有序可用 */
function randomDate(rng: () => number, daysBack: number): string {
  const now = Date.UTC(2026, 9, 15, 0, 0, 0); // 固定基准日，保证可复现
  const offset = Math.floor(rng() * daysBack * 24 * 3600 * 1000);
  return new Date(now - offset).toISOString();
}

/** 拼接两个 ISO 时间：后一个 >= 前一个 */
function after(iso: string, minHours: number, maxHours: number, rng: () => number): string {
  const base = new Date(iso).getTime();
  const span = (minHours + rng() * (maxHours - minHours)) * 3600 * 1000;
  return new Date(base + span).toISOString();
}

/* ============================== 主生成函数 ============================== */

/**
 * 「演示就绪」生成完整演示数据集。
 *
 * @param seed 随机种子；不传则使用 DEFAULT_SEED，保证两次调用结果完全一致。
 * @returns 自洽、外键一致的 DemoData。
 */
export function generateDemoData(seed: number = DEFAULT_SEED): DemoData {
  const rng = makeRng(seed);

  /* ---------- 科室 ---------- */
  const departments: Department[] = [];
  for (let i = 0; i < COUNT_DEPARTMENTS; i++) {
    const [name, code] = DEPARTMENT_POOL[i];
    departments.push({ id: `DEPT${pad(i + 1, 2)}`, name, code });
  }

  /* ---------- 姓名 ---------- */
  const genName = (): { name: string; gender: Gender } => {
    const gender: Gender = rng() < 0.5 ? 'M' : 'F';
    const given = gender === 'M' ? pick(rng, GIVEN_M) : pick(rng, GIVEN_F);
    return { name: pick(rng, SURNAMES) + given, gender };
  };

  /* ---------- 员工 ---------- */
  const makeStaff = (prefix: string, role: StaffRole, count: number, titles: readonly string[]): Staff[] => {
    const list: Staff[] = [];
    for (let i = 0; i < count; i++) {
      const { name, gender } = genName();
      list.push({
        id: `${prefix}${pad(i + 1, role === 'doctor' ? 4 : 3)}`,
        name,
        role,
        // 管理员不挂在药剂科；其余角色按科室池分配
        deptId: departments[pickIdx(rng, departments.length)].id,
        title: pick(rng, titles),
        gender,
      });
    }
    return list;
  };

  const doctors = makeStaff('D', 'doctor', COUNT_DOCTORS, DOCTOR_TITLES);
  const nurses = makeStaff('N', 'nurse', COUNT_NURSES, NURSE_TITLES);
  const pharmacists = makeStaff('P', 'pharmacist', COUNT_PHARMACISTS, PHARMACIST_TITLES);
  const admins = makeStaff('A', 'admin', COUNT_ADMINS, ADMIN_TITLES);

  /* ---------- 患者 ---------- */
  const patients: Patient[] = [];
  for (let i = 0; i < COUNT_PATIENTS; i++) {
    const { name, gender } = genName();
    patients.push({
      id: `P${pad(i + 1, 4)}`,
      name,
      gender,
      age: 1 + Math.floor(rng() * 95),
      preferredDeptId: rng() < 0.8 ? departments[pickIdx(rng, departments.length)].id : null,
    });
  }

  /* ---------- 就诊记录 ---------- */
  const visits: VisitRecord[] = [];
  for (let i = 0; i < COUNT_VISITS; i++) {
    const doctor = doctors[pickIdx(rng, doctors.length)];
    const patient = patients[pickIdx(rng, patients.length)];
    const visitType: VisitType = rng() < 0.75 ? 'outpatient' : rng() < 0.6 ? 'emergency' : 'inpatient';
    visits.push({
      id: `V${pad(i + 1, 6)}`,
      patientId: patient.id,
      doctorId: doctor.id,
      deptId: doctor.deptId,
      visitType,
      diagnosis: pick(rng, DIAGNOSES),
      visitedAt: randomDate(rng, 365),
    });
  }

  /* ---------- 处方（挂在前 2000 条就诊下） ---------- */
  const prescriptions: Prescription[] = [];
  for (let i = 0; i < COUNT_PRESCRIPTIONS; i++) {
    const visit = visits[pickIdx(rng, COUNT_PRESCRIPTIONS)]; // 集中在前 2000 条就诊，保证覆盖率
    const [drug, dosage] = pick(rng, DRUGS);
    prescriptions.push({
      id: `RX${pad(i + 1, 6)}`,
      visitId: visit.id,
      patientId: visit.patientId,
      doctorId: visit.doctorId,
      drugName: drug,
      dosage,
      quantity: 1 + Math.floor(rng() * 4),
      prescribedAt: after(visit.visitedAt, 0, 2, rng),
    });
  }

  /* ---------- 住院记录 ---------- */
  const admissions: Admission[] = [];
  const wardPool = departments.filter((d) => d.name !== '药剂科');
  for (let i = 0; i < COUNT_ADMISSIONS; i++) {
    const doctor = doctors[pickIdx(rng, doctors.length)];
    const patient = patients[pickIdx(rng, patients.length)];
    const dept = wardPool[pickIdx(rng, wardPool.length)];
    const admittedAt = randomDate(rng, 400);
    const discharged = rng() < 0.7;
    admissions.push({
      id: `ADM${pad(i + 1, 5)}`,
      patientId: patient.id,
      doctorId: doctor.id,
      deptId: dept.id,
      ward: `${dept.name}病区`,
      bedNo: `${1 + pickIdx(rng, 20)}床`,
      admittedAt,
      dischargedAt: discharged ? after(admittedAt, 24, 24 * 21, rng) : null,
    });
  }

  /* ---------- 员工经验记忆 ---------- */
  const allClinicalStaff: Staff[] = [...doctors, ...nurses, ...pharmacists];
  const staffDecisionMemories: StaffDecisionMemory[] = [];
  for (let i = 0; i < COUNT_STAFF_MEMORIES; i++) {
    const staff = allClinicalStaff[pickIdx(rng, allClinicalStaff.length)];
    const r = rng();
    staffDecisionMemories.push({
      id: `MEM${pad(i + 1, 7)}`,
      staffId: staff.id,
      deptId: staff.deptId,
      scenario: pick(rng, MEMORY_SCENARIOS),
      decision: pick(rng, MEMORY_DECISIONS),
      outcome: r < 0.6 ? 'positive' : r < 0.85 ? 'neutral' : 'negative',
      createdAt: randomDate(rng, 730),
    });
  }

  /* ---------- 患者反馈 ---------- */
  const patientFeedbacks: PatientFeedback[] = [];
  for (let i = 0; i < COUNT_PATIENT_FEEDBACKS; i++) {
    const patient = patients[pickIdx(rng, patients.length)];
    const staff = allClinicalStaff[pickIdx(rng, allClinicalStaff.length)];
    patientFeedbacks.push({
      id: `FB${pad(i + 1, 6)}`,
      patientId: patient.id,
      staffId: staff.id,
      score: 1 + Math.floor(rng() * 5),
      comment: pick(rng, FEEDBACK_COMMENTS),
      createdAt: randomDate(rng, 180),
    });
  }

  return {
    departments,
    doctors,
    nurses,
    pharmacists,
    admins,
    patients,
    visits,
    prescriptions,
    admissions,
    staffDecisionMemories,
    patientFeedbacks,
    generatedAt: new Date(Date.UTC(2026, 9, 15, 12, 0, 0)).toISOString(),
  };
}
