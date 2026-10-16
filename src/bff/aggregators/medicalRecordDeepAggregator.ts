/**
 * 健澜科技 jlmedaios - 【病案设备耗材】医院病案管理深化聚合器（M177-A），纯函数。
 *
 * 病案编码要 ICD 标准，不能自创：
 *  - 诊断编码统一采用 ICD-10（如 I50.9 心力衰竭、J18.9 肺炎、E11.9 2 型糖尿病）；
 *  - 手术/操作编码统一采用 ICD-9-CM-3（如 47.09 阑尾切除术、81.54 全膝关节置换、
 *    36.10 主动脉-冠状动脉旁路移植）；
 *  - 本模块对编码做"标准格式 + 章节范围"强校验，非法 / 自创编码（含中文、字母越界、
 *    位数不符、缺小数点层级）一律判 invalid 并退回编码员；完整临床版/医保版编码字典
 *    由病案室从国家卫健委下发版本导入，本文件不内置、不臆造任何疾病-编码对照。
 *
 * 四个纯函数（无副作用、不触库，便于单测）：
 *   1. buildDeepMedicalRecord()    —— 深度病案管理总装（编码+归档+质控+借阅一屏）
 *   2. validateICDCoding()        —— ICD 编码校验（ICD-10 诊断 + ICD-9-CM-3 手术）
 *   3. checkRecordCompletion()     —— 病案首页完整性检查（缺项率）
 *   4. generateRecordQualityReport() —— 病案质量报告（首页合格率/编码准确率/缺项率）
 *
 * 医疗安全红线：仅病案管理与质控辅助，不触发诊疗、不自动改诊断/手术、不自动归档。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

/** 病案首页诊断条目（ICD-10） */
export interface RecordDiagnosis {
  /** ICD-10 编码，如 'I50.9' */
  code: string;
  /** 诊断名称 */
  name: string;
  /** principal=主诊断；secondary=其他诊断 */
  rank: 'principal' | 'secondary';
}

/** 病案首页手术/操作条目（ICD-9-CM-3） */
export interface RecordSurgery {
  /** ICD-9-CM-3 编码，如 '47.09' */
  code: string;
  /** 手术/操作名称 */
  name: string;
  /** 手术分级 1-4 级 */
  level?: 'level1' | 'level2' | 'level3' | 'level4';
  /** 手术日期 ISO */
  date?: string;
}

/** 病案记录（首页关键字段，纯数据，无 I/O） */
export interface DeepMedicalRecord {
  recordId: string;
  visitId: string;
  patientId: string;
  department: string;
  /** 出院时间 ISO */
  dischargeAt?: string;
  /** 归档时限（天），标准出院后 3 个工作日，纯函数按自然日近似 */
  archiveDeadlineDays?: number;
  /** 实际归档时间 ISO；null/undefined=未归档 */
  archivedAt?: string | null;

  // —— 首页完整性要素 ——
  gender?: string;
  age?: number | null;
  /** 出院方式：治愈/好转/未愈/死亡/其他 */
  dischargeDisposition?: string;
  /** 实际住院日（天） */
  losDays?: number | null;
  /** 住院总费用（元） */
  totalFee?: number | null;
  /** 是否有手术 */
  hasSurgery?: boolean;
  /** 出院医师签名 */
  doctorSigned?: boolean;
  /** 编码员签名 */
  coderSigned?: boolean;

  // —— 借阅 ——
  borrowStatus?: 'none' | 'borrowed' | 'returned' | 'overdue';
  confidentiality?: 'internal' | 'confidential' | 'secret';
  /** 借阅应还时间 ISO（用于超期判断） */
  borrowDueAt?: string | null;
  /** 参考时间点（纯函数可注入，缺省取 now） */
  now?: string;
}

// ---------------------------------------------------------------------------
// 常量（政策口径）
// ---------------------------------------------------------------------------

/** 病案归档时限：出院后 3 个工作日内（纯函数按自然日近似为 3 天） */
export const ARCHIVE_DEADLINE_DAYS = 3;

/** 首页合格线：编码准确率 ≥ 该值且无缺项才算首页合格 */
export const FRONT_PAGE_PASS_ACCURACY = 1.0;

/** ICD-10 编码格式：字母 + 2 位数字 + 可选小数点后 1-4 位；
 *  字母段 A-T、V-Z（U 为 WHO 预留，不用于正式病案）。 */
export const ICD10_PATTERN = /^[A-TV-Z]\d{2}(\.\d{1,4})?$/;
/** ICD-9-CM-3 手术操作编码格式：1-2 位整数章（00-99）+ 可选小数点后 1-2 位 */
export const ICD9CM3_PATTERN = /^\d{1,2}(\.\d{1,2})?$/;

/** 病案首页必填要素（完整性检查口径） */
export const REQUIRED_FRONT_PAGE_ITEMS = [
  '主诊断编码',
  '主诊断名称',
  '性别',
  '年龄',
  '出院方式',
  '实际住院日',
  '住院总费用',
  '出院医师签名',
  '编码员签名',
] as const;

// ---------------------------------------------------------------------------
// 工具
// ---------------------------------------------------------------------------

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

/** 规范编码串：去首尾空格、去全角空格、转大写；不做任何"补全/猜测" */
function normalizeCode(raw: string): string {
  return (raw || '').trim().replace(/\u3000/g, '').toUpperCase();
}

/** 编码是否含中文字符（典型自创/手误特征） */
function containsChinese(s: string): boolean {
  return /[\u4e00-\u9fff]/.test(s);
}

/**
 * ICD-10 单编码校验（标准格式 + 章节范围）。
 * 只判"是否符合 ICD-10 书写规范"，不维护疾病字典；不合法即疑似自创，退回编码员。
 */
export function isValidICD10(code: string): boolean {
  const c = normalizeCode(code);
  if (!c) return false;
  if (containsChinese(c)) return false;
  return ICD10_PATTERN.test(c);
}

/**
 * ICD-9-CM-3 单手术操作编码校验。
 * 章号范围 00-99；小数点后 1-2 位；含字母/中文一律判非法。
 */
export function isValidICD9CM3(code: string): boolean {
  const c = normalizeCode(code);
  if (!c) return false;
  if (containsChinese(c)) return false;
  if (!ICD9CM3_PATTERN.test(c)) return false;
  const chapter = Number(c.split('.')[0]);
  return chapter >= 0 && chapter <= 99;
}

// ---------------------------------------------------------------------------
// 1) ICD 编码校验（ICD-10 诊断 + ICD-9-CM-3 手术）
// ---------------------------------------------------------------------------

export interface ICDCodeIssue {
  code: string;
  kind: 'diagnosis' | 'surgery';
  name?: string;
  valid: boolean;
  reasons: string[];
}

export interface ICDValidationResult {
  /** 全部编码合法且主诊断已编码 = true */
  valid: boolean;
  issues: ICDCodeIssue[];
  totalDiagnoses: number;
  validDiagnoses: number;
  totalSurgeries: number;
  validSurgeries: number;
  /** 编码准确率 = 合法编码数 / 应编码条目总数 */
  codingAccuracy: number;
}

/**
 * 病案 ICD 编码校验：诊断走 ICD-10、手术走 ICD-9-CM-3。
 * - 主诊断缺失编码直接判 invalid；
 * - 任一编码格式非法（含中文/字母越界/位数不符）判 invalid，绝不"帮编码员补全"；
 * - 空列表安全降级：诊断为空仅提示，不抛错。
 */
export function validateICDCoding(
  record: Pick<DeepMedicalRecord, 'recordId' | 'hasSurgery'>,
  diagnoses: RecordDiagnosis[],
  surgeries: RecordSurgery[],
): ICDValidationResult {
  const issues: ICDCodeIssue[] = [];
  const dxList = Array.isArray(diagnoses) ? diagnoses : [];
  const sxList = Array.isArray(surgeries) ? surgeries : [];

  let validDx = 0;
  for (const d of dxList) {
    const code = normalizeCode(d.code);
    const reasons: string[] = [];
    if (!code) {
      reasons.push(d.rank === 'principal' ? '主诊断未填 ICD-10 编码' : '其他诊断未填编码');
    } else if (!isValidICD10(code)) {
      reasons.push(`编码 "${code}" 不符合 ICD-10 规范（字母+2位数字[.后1-4位]，如 I50.9），疑似自创编码，退回重编`);
    }
    if (reasons.length === 0) validDx += 1;
    issues.push({ code: code || '(空)', kind: 'diagnosis', name: d.name, valid: reasons.length === 0, reasons });
  }

  // 主诊断存在性：诊断列表里应有 principal
  const hasPrincipal = dxList.some((d) => d.rank === 'principal');
  if (!hasPrincipal) {
    issues.push({ code: '(空)', kind: 'diagnosis', valid: false, reasons: ['缺少主诊断（principal），病案首页不允许无主诊断'] });
  }

  let validSx = 0;
  for (const s of sxList) {
    const code = normalizeCode(s.code);
    const reasons: string[] = [];
    if (!code) {
      reasons.push('手术/操作未填 ICD-9-CM-3 编码');
    } else if (!isValidICD9CM3(code)) {
      reasons.push(`编码 "${code}" 不符合 ICD-9-CM-3 规范（章号 00-99[.后1-2位]，如 47.09），疑似自创编码，退回重编`);
    }
    if (reasons.length === 0) validSx += 1;
    issues.push({ code: code || '(空)', kind: 'surgery', name: s.name, valid: reasons.length === 0, reasons });
  }

  // 有手术标记但手术清单为空 → 缺手术编码
  if (record?.hasSurgery && sxList.length === 0) {
    issues.push({ code: '(空)', kind: 'surgery', valid: false, reasons: ['首页标记"有手术"但手术/操作清单为空，须补 ICD-9-CM-3 编码'] });
  }

  const total = dxList.length + sxList.length;
  const validTotal = validDx + validSx;
  const allOk = issues.length > 0 && issues.every((i) => i.valid);

  return {
    valid: allOk,
    issues,
    totalDiagnoses: dxList.length,
    validDiagnoses: validDx,
    totalSurgeries: sxList.length,
    validSurgeries: validSx,
    codingAccuracy: total > 0 ? round3(validTotal / total) : 0,
  };
}

// ---------------------------------------------------------------------------
// 2) 病案首页完整性检查
// ---------------------------------------------------------------------------

export interface CompletionResult {
  /** 必填项无缺失 = true */
  complete: boolean;
  /** 完成率 0..1 */
  completionRate: number;
  /** 缺项明细 */
  missingItems: string[];
  filledItems: number;
  totalRequiredItems: number;
}

/**
 * 病案首页完整性检查：逐项核对 REQUIRED_FRONT_PAGE_ITEMS。
 * 手术病例额外要求至少一条手术/操作（含合法 ICD-9-CM-3 编码）。
 * 非法输入安全降级：空记录 → 全部缺项，不抛错。
 */
export function checkRecordCompletion(
  record: DeepMedicalRecord,
  diagnoses: RecordDiagnosis[],
  surgeries: RecordSurgery[],
): CompletionResult {
  const dxList = Array.isArray(diagnoses) ? diagnoses : [];
  const sxList = Array.isArray(surgeries) ? surgeries : [];
  const principal = dxList.find((d) => d.rank === 'principal');

  const missing: string[] = [];

  if (!normalizeCode(principal?.code ?? '')) missing.push('主诊断编码');
  if (!principal?.name?.trim()) missing.push('主诊断名称');
  if (!record.gender?.trim()) missing.push('性别');
  if (record.age == null || Number.isNaN(record.age)) missing.push('年龄');
  if (!record.dischargeDisposition?.trim()) missing.push('出院方式');
  if (record.losDays == null || record.losDays <= 0) missing.push('实际住院日');
  if (record.totalFee == null || record.totalFee < 0) missing.push('住院总费用');
  if (!record.doctorSigned) missing.push('出院医师签名');
  if (!record.coderSigned) missing.push('编码员签名');

  // 手术病例额外完整性
  if (record.hasSurgery && sxList.length === 0) {
    missing.push('手术/操作记录');
  }

  const filled = REQUIRED_FRONT_PAGE_ITEMS.length - missing.filter((m) =>
    (REQUIRED_FRONT_PAGE_ITEMS as readonly string[]).includes(m),
  ).length;

  return {
    complete: missing.length === 0,
    completionRate: round3(REQUIRED_FRONT_PAGE_ITEMS.length > 0 ? filled / REQUIRED_FRONT_PAGE_ITEMS.length : 0),
    missingItems: missing,
    filledItems: filled,
    totalRequiredItems: REQUIRED_FRONT_PAGE_ITEMS.length,
  };
}

// ---------------------------------------------------------------------------
// 3) 病案归档与借阅派生指标
// ---------------------------------------------------------------------------

export interface ArchiveStatus {
  archived: boolean;
  /** 是否按时归档（出院后时限内归档） */
  onTime: boolean;
  /** 距归档时限剩余天数（负数=已逾期未归档） */
  daysToDeadline: number;
}

/** 归档状态判定：出院时间 + 时限 vs 实际归档时间。 */
export function checkArchiveStatus(record: DeepMedicalRecord): ArchiveStatus {
  const now = record.now ? new Date(record.now).getTime() : Date.now();
  const deadlineDays = record.archiveDeadlineDays ?? ARCHIVE_DEADLINE_DAYS;
  const discharge = record.dischargeAt ? new Date(record.dischargeAt).getTime() : NaN;
  if (Number.isNaN(discharge)) {
    return { archived: false, onTime: false, daysToDeadline: deadlineDays };
  }
  const deadline = discharge + deadlineDays * 24 * 3600 * 1000;
  const archived = !!record.archivedAt;
  const archivedAt = record.archivedAt ? new Date(record.archivedAt).getTime() : now;
  return {
    archived,
    onTime: archived && archivedAt <= deadline,
    daysToDeadline: Math.ceil((deadline - now) / (24 * 3600 * 1000)),
  };
}

/** 借阅是否超期：状态 borrowed/overdue 且应还时间已过。 */
export function isBorrowOverdue(record: DeepMedicalRecord): boolean {
  if (record.borrowStatus !== 'borrowed' && record.borrowStatus !== 'overdue') return false;
  if (!record.borrowDueAt) return false;
  const now = record.now ? new Date(record.now).getTime() : Date.now();
  return new Date(record.borrowDueAt).getTime() < now;
}

// ---------------------------------------------------------------------------
// 4) 深度病案管理总装
// ---------------------------------------------------------------------------

export interface DeepMedicalRecordInput {
  record: DeepMedicalRecord;
  diagnoses: RecordDiagnosis[];
  surgeries: RecordSurgery[];
}

export interface DeepMedicalRecordView {
  recordId: string;
  visitId: string;
  department: string;
  coding: ICDValidationResult;
  completion: CompletionResult;
  archive: ArchiveStatus;
  borrowOverdue: boolean;
  confidentiality: NonNullable<DeepMedicalRecord['confidentiality']>;
  /** 首页是否合格：编码全合法 + 首页完整 */
  frontPagePass: boolean;
}

/**
 * 深度病案管理总装：把编码校验、完整性、归档、借阅串成一屏结论。
 * 纯函数：输入病案+诊断+手术，输出可直接落库/前端渲染的结构化结果。
 */
export function buildDeepMedicalRecord(input: DeepMedicalRecordInput): DeepMedicalRecordView {
  const { record, diagnoses, surgeries } = input;
  const coding = validateICDCoding(record, diagnoses, surgeries);
  const completion = checkRecordCompletion(record, diagnoses, surgeries);
  const archive = checkArchiveStatus(record);
  const borrowOverdue = isBorrowOverdue(record);

  return {
    recordId: record.recordId,
    visitId: record.visitId,
    department: record.department,
    coding,
    completion,
    archive,
    borrowOverdue,
    confidentiality: record.confidentiality ?? 'internal',
    frontPagePass: coding.valid
      && completion.complete
      && coding.codingAccuracy >= FRONT_PAGE_PASS_ACCURACY,
  };
}

// ---------------------------------------------------------------------------
// 5) 病案质量报告（按期汇总）
// ---------------------------------------------------------------------------

export interface QualityReportInput {
  record: DeepMedicalRecord;
  diagnoses: RecordDiagnosis[];
  surgeries: RecordSurgery[];
}

export interface RecordQualityReport {
  period: string;
  totalRecords: number;
  /** 首页合格率 = 首页合格病案数 / 病案总数 */
  frontPagePassRate: number;
  /** 编码准确率 = 合法编码数 / 编码条目总数 */
  codingAccuracy: number;
  /** 缺项率 = 缺项字段人次数 /（病案数 × 应填字段数） */
  missingItemRate: number;
  /** 归档及时率 = 按时归档数 / 已归档（含逾期）数 */
  archiveOnTimeRate: number;
  /** 借阅超期数 */
  overdueBorrowCount: number;
  /** 不合格病案清单（供整改） */
  failedRecords: Array<{
    recordId: string;
    visitId: string;
    reasons: string[];
  }>;
}

/**
 * 病案质量报告：周期 + 病案列表 → 首页合格率 / 编码准确率 / 缺项率 / 归档及时率 / 借阅超期。
 * 纯函数：空列表返回零值报告，不虚构数字。
 */
export function generateRecordQualityReport(
  period: string,
  records: QualityReportInput[] = [],
): RecordQualityReport {
  const list = Array.isArray(records) ? records : [];
  const total = list.length;
  if (total === 0) {
    return {
      period, totalRecords: 0,
      frontPagePassRate: 0, codingAccuracy: 0, missingItemRate: 0,
      archiveOnTimeRate: 0, overdueBorrowCount: 0, failedRecords: [],
    };
  }

  let passCount = 0;
  let validCodeSum = 0;
  let totalCodeSum = 0;
  let missingItemSum = 0;
  let archivedCount = 0;
  let onTimeCount = 0;
  let overdueBorrow = 0;
  const failed: RecordQualityReport['failedRecords'] = [];

  for (const item of list) {
    const view = buildDeepMedicalRecord(item);
    if (view.frontPagePass) {
      passCount += 1;
    } else {
      const reasons: string[] = [];
      if (!view.coding.valid) reasons.push('ICD 编码存在非法/自创项');
      if (!view.completion.complete) reasons.push(`缺项：${view.completion.missingItems.join('、')}`);
      failed.push({ recordId: view.recordId, visitId: view.visitId, reasons });
    }
    validCodeSum += view.coding.validDiagnoses + view.coding.validSurgeries;
    totalCodeSum += view.coding.totalDiagnoses + view.coding.totalSurgeries;
    missingItemSum += view.completion.missingItems.length;
    if (view.archive.archived) {
      archivedCount += 1;
      if (view.archive.onTime) onTimeCount += 1;
    }
    if (view.borrowOverdue) overdueBorrow += 1;
  }

  return {
    period,
    totalRecords: total,
    frontPagePassRate: round3(passCount / total),
    codingAccuracy: totalCodeSum > 0 ? round3(validCodeSum / totalCodeSum) : 0,
    missingItemRate: round3(missingItemSum / (total * REQUIRED_FRONT_PAGE_ITEMS.length)),
    archiveOnTimeRate: archivedCount > 0 ? round3(onTimeCount / archivedCount) : 0,
    overdueBorrowCount: overdueBorrow,
    failedRecords: failed,
  };
}
