/**
 * 健澜科技 jlmedaios - M129-C 标准数据导入聚合器（【系统集成】）
 *
 * 【系统集成】面向医院第三方系统（HIS / EMR / 体检 / 基层公卫平台）数据对接的
 * 标准导入纯函数层，覆盖三类业务数据：
 *  - 患者基本信息（patients）：patientNo 为主键，姓名 / 性别 / 出生日期 / 联系电话；
 *  - 就诊记录（visits）：visitId 为主键，通过 patientNo 挂接到患者；
 *  - 处方记录（prescriptions）：prescriptionId 为主键，通过 visitId 挂接到就诊。
 *
 * 三个纯函数（零 I/O、零新增依赖，便于单测与前端复用）：
 *  - generateImportTemplate()：产出标准导入模板（字段说明 + 一行示例信封），
 *    供 GET /admin/import/template 下发与前端「下载模板」；
 *  - validateImportData(data)：对已解析信封做结构与业务校验，返回
 *    errors（致命，整行拒收）/ warnings（提示但放行）与各类行数统计，不抛异常；
 *  - importPatientData(jsonData)：解析并校验导入文件，产出 ImportResult——
 *    accepted 为逐行通过校验的干净行集，rejected 为带行号/字段的错误清单。
 *
 * 分层约束（与 routes/adminImport.ts 协作）：
 *  - 本层只做「格式校验 + 行级分拣」，不做物理写库——
 *    真正的患者主索引合并与事务回灌由 EMRPI / 受控导入作业执行；
 *  - 跨表引用在包内闭环：visits.patientNo 必须出现在本包 patients 中，
 *    prescriptions.visitId 必须出现在本包 visits 中，否则该行拒收；
 *  - 不碰 WebSocket、不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 导入信封工具标识，导入端据此识别本系统产物，拒绝异系统文件 */
export const IMPORT_TOOL = 'jlmedaios-data-import';

/** 导入信封版本号；信封结构升级时递增，导入端据此做兼容判断 */
export const IMPORT_VERSION = '1.0.0';

/* ----------------------------------------------------------------------------
 * 业务数据模型
 * -------------------------------------------------------------------------- */

/** 患者基本信息记录（patients 行） */
export interface PatientRecord {
  /** 患者唯一标识（住院号/门诊号），导入包内主键 */
  patientNo: string;
  /** 患者姓名 */
  name: string;
  /** 性别 */
  gender: '男' | '女' | '未知';
  /** 出生日期 yyyy-mm-dd */
  birthDate: string;
  /** 联系电话（可空） */
  phone?: string | null;
}

/** 就诊类型 */
export type VisitType = 'outpatient' | 'inpatient' | 'emergency';

/** 就诊记录行（visits 行） */
export interface VisitRecord {
  /** 就诊 ID，导入包内主键 */
  visitId: string;
  /** 挂接患者：必须出现在本包 patients.patientNo 中 */
  patientNo: string;
  /** 就诊类型：outpatient 门诊 / inpatient 住院 / emergency 急诊 */
  visitType: VisitType;
  /** 就诊科室名称 */
  deptName: string;
  /** 就诊日期 yyyy-mm-dd */
  visitDate: string;
  /** 诊断（可空） */
  diagnosis?: string | null;
}

/** 处方记录行（prescriptions 行） */
export interface PrescriptionRecord {
  /** 处方 ID，导入包内主键 */
  prescriptionId: string;
  /** 挂接就诊：必须出现在本包 visits.visitId 中 */
  visitId: string;
  /** 药品名称 */
  drugName: string;
  /** 规格（可空） */
  spec?: string | null;
  /** 用法用量（可空） */
  dosage?: string | null;
  /** 用药频次（可空） */
  frequency?: string | null;
  /** 数量（可空） */
  quantity?: number | null;
  /** 开具时间（可空，ISO 或 yyyy-mm-dd） */
  prescribedAt?: string | null;
}

/** 标准导入信封（导入文件即此形状的 JSON） */
export interface PatientImportEnvelope {
  /** 固定标识 jlmedaios-data-import */
  tool: typeof IMPORT_TOOL;
  /** 信封版本号，如 1.0.0 */
  version: string;
  /** 固定种类 patient-import */
  kind: 'patient-import';
  /** 患者基本信息行集 */
  patients: PatientRecord[];
  /** 就诊记录行集 */
  visits: VisitRecord[];
  /** 处方记录行集 */
  prescriptions: PrescriptionRecord[];
}

/* ----------------------------------------------------------------------------
 * 校验结果模型
 * -------------------------------------------------------------------------- */

/** 三类业务数据段 */
export type ImportSection = 'patients' | 'visits' | 'prescriptions';

/** 行级校验问题（errors 致命拒收 / warnings 提示放行共用此结构） */
export interface ImportIssue {
  /** 所属数据段 */
  section: ImportSection;
  /** 行号（从 1 开始，面向运营人员报错定位；0 表示信封级问题） */
  row: number;
  /** 出错字段名；@envelope 表示信封整体结构问题 */
  field: string;
  /** 可读中文错误描述 */
  message: string;
  /** 原始入参值（便于前端弹窗展示） */
  value: unknown;
}

/** validateImportData 返回结构 */
export interface ValidationResult {
  /** true = 无致命错误，全部行可收 */
  valid: boolean;
  /** 致命错误：对应整行拒收，不进入 accepted */
  errors: ImportIssue[];
  /** 警告：不阻断导入，但需在结果页提示 */
  warnings: ImportIssue[];
  /** 三段原始行数统计（未剔错前） */
  counts: { patients: number; visits: number; prescriptions: number };
}

/** importPatientData 返回结构 */
export interface ImportResult {
  /** 固定标识 */
  tool: typeof IMPORT_TOOL;
  /** 信封版本号 */
  version: string;
  /** 导入受理时刻 ISO */
  importedAt: string;
  /** 通过校验、可回灌的干净行集 */
  accepted: { patients: PatientRecord[]; visits: VisitRecord[]; prescriptions: PrescriptionRecord[] };
  /** 被拒收的行级问题清单（含行号/字段/原值） */
  rejected: ImportIssue[];
  /** 受理统计：三段收数 + 拒收行数 */
  counts: { patients: number; visits: number; prescriptions: number; rejectedRows: number };
  /** 完整校验结果（errors + warnings + counts），供结果页展示 */
  validation: ValidationResult;
}

/* ----------------------------------------------------------------------------
 * 模板结构
 * -------------------------------------------------------------------------- */

/** 模板字段说明 */
export interface TemplateField {
  /** 字段键名 */
  name: string;
  /** 中文标题 */
  title: string;
  /** 是否必填 */
  required: boolean;
  /** 取值类型说明 */
  type: string;
  /** 填写说明 */
  description: string;
}

/** 模板数据段说明 */
export interface TemplateSection {
  /** 段键 */
  key: ImportSection;
  /** 段中文标题 */
  title: string;
  /** 字段清单 */
  fields: TemplateField[];
  /** 一行示例行（与信封 example 对齐） */
  sample: Record<string, unknown>;
}

/** generateImportTemplate 返回结构 */
export interface ImportTemplate {
  tool: typeof IMPORT_TOOL;
  version: string;
  kind: 'patient-import-template';
  /** 模板整体说明 */
  description: string;
  /** 三段字段说明 */
  sections: TemplateSection[];
  /** 可直接改造使用的一行示例信封 */
  example: PatientImportEnvelope;
}

/* ----------------------------------------------------------------------------
 * 内部工具（零依赖）
 * -------------------------------------------------------------------------- */

/** 性别合法取值 */
const GENDERS = ['男', '女', '未知'] as const;

/** 就诊类型合法取值 */
const VISIT_TYPES: readonly VisitType[] = ['outpatient', 'inpatient', 'emergency'];

/** 日期格式：yyyy-mm-dd */
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 任意值 → 普通对象（非数组），否则返回 null */
function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

/** 任意值 → 去空白后的非空字符串，否则 null */
function asNonEmptyString(v: unknown): string | null {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
}

/** yyyy-mm-dd 严格日期校验（拒绝 2026-02-30 这类语义错误日期） */
function isValidDate(s: string): boolean {
  if (!DATE_RE.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/* ----------------------------------------------------------------------------
 * generateImportTemplate（纯函数）
 * -------------------------------------------------------------------------- */

/**
 * generateImportTemplate：产出标准导入模板。
 *
 * 包含三段字段说明（必填/选填、类型、填写规范）与一份可直接改造的
 * 一行示例信封；前端「下载模板」与 BFF GET /admin/import/template 共用此产物。
 */
export function generateImportTemplate(): ImportTemplate {
  const patientSample: PatientRecord = {
    patientNo: 'P00001',
    name: '张三',
    gender: '男',
    birthDate: '1985-06-15',
    phone: '13800000000',
  };
  const visitSample: VisitRecord = {
    visitId: 'V20261016001',
    patientNo: 'P00001',
    visitType: 'outpatient',
    deptName: '心血管内科',
    visitDate: '2026-10-16',
    diagnosis: '高血压病2级',
  };
  const prescriptionSample: PrescriptionRecord = {
    prescriptionId: 'RX20261016001',
    visitId: 'V20261016001',
    drugName: '苯磺酸氨氯地平片',
    spec: '5mg*14片',
    dosage: '5mg',
    frequency: '每日一次',
    quantity: 1,
    prescribedAt: '2026-10-16',
  };

  return {
    tool: IMPORT_TOOL,
    version: IMPORT_VERSION,
    kind: 'patient-import-template',
    description:
      '标准患者数据导入模板：三段信封 patients / visits / prescriptions。' +
      '跨段引用在包内闭环——visits.patientNo 必须出现在 patients 中，' +
      'prescriptions.visitId 必须出现在 visits 中。删除示例行后按字段说明填写。',
    sections: [
      {
        key: 'patients',
        title: '患者基本信息',
        fields: [
          { name: 'patientNo', title: '患者标识', required: true, type: 'string', description: '住院号/门诊号，导入包内唯一主键，全局不重复' },
          { name: 'name', title: '姓名', required: true, type: 'string', description: '患者真实姓名，非空' },
          { name: 'gender', title: '性别', required: true, type: 'enum', description: '取值：男 / 女 / 未知' },
          { name: 'birthDate', title: '出生日期', required: true, type: 'date', description: '格式 yyyy-mm-dd，须为合法日历日期' },
          { name: 'phone', title: '联系电话', required: false, type: 'string', description: '手机或座机号，可空' },
        ],
        sample: patientSample as unknown as Record<string, unknown>,
      },
      {
        key: 'visits',
        title: '就诊记录',
        fields: [
          { name: 'visitId', title: '就诊ID', required: true, type: 'string', description: '就诊唯一标识，导入包内不重复' },
          { name: 'patientNo', title: '挂接患者', required: true, type: 'string', description: '必须存在于本包 patients.patientNo' },
          { name: 'visitType', title: '就诊类型', required: true, type: 'enum', description: 'outpatient 门诊 / inpatient 住院 / emergency 急诊' },
          { name: 'deptName', title: '就诊科室', required: true, type: 'string', description: '科室名称，非空' },
          { name: 'visitDate', title: '就诊日期', required: true, type: 'date', description: '格式 yyyy-mm-dd' },
          { name: 'diagnosis', title: '诊断', required: false, type: 'string', description: '初步诊断/出院诊断，可空' },
        ],
        sample: visitSample as unknown as Record<string, unknown>,
      },
      {
        key: 'prescriptions',
        title: '处方记录',
        fields: [
          { name: 'prescriptionId', title: '处方ID', required: true, type: 'string', description: '处方唯一标识，导入包内不重复' },
          { name: 'visitId', title: '挂接就诊', required: true, type: 'string', description: '必须存在于本包 visits.visitId' },
          { name: 'drugName', title: '药品名称', required: true, type: 'string', description: '通用名或商品名，非空' },
          { name: 'spec', title: '规格', required: false, type: 'string', description: '如 5mg*14片，可空' },
          { name: 'dosage', title: '用法用量', required: false, type: 'string', description: '单次剂量，可空' },
          { name: 'frequency', title: '用药频次', required: false, type: 'string', description: '如 每日一次，可空' },
          { name: 'quantity', title: '数量', required: false, type: 'number', description: '开药数量，数字，可空' },
          { name: 'prescribedAt', title: '开具时间', required: false, type: 'date', description: 'yyyy-mm-dd 或 ISO，可空' },
        ],
        sample: prescriptionSample as unknown as Record<string, unknown>,
      },
    ],
    example: {
      tool: IMPORT_TOOL,
      version: IMPORT_VERSION,
      kind: 'patient-import',
      patients: [patientSample],
      visits: [visitSample],
      prescriptions: [prescriptionSample],
    },
  };
}

/* ----------------------------------------------------------------------------
 * validateImportData（纯函数，不抛异常）
 * -------------------------------------------------------------------------- */

/**
 * validateImportData：对已解析信封做结构与业务校验。
 *
 * 任何形状输入都不抛异常——信封级结构问题记入 errors（row=0, field=@envelope），
 * 行级问题带 1-based 行号，便于运营人员在原始文件中定位。
 *
 * 校验顺序（与跨表依赖一致）：
 *  信封结构 -> patients 行 -> visits 行（引用已通过校验的 patientNo 集合）
 *  -> prescriptions 行（引用已通过校验的 visitId 集合）。
 *
 * @param data 已解析的导入信封对象（JSON.parse 之后）
 */
export function validateImportData(data: unknown): ValidationResult {
  const errors: ImportIssue[] = [];
  const warnings: ImportIssue[] = [];

  const env = asRecord(data);
  if (!env) {
    errors.push({ section: 'patients', row: 0, field: '@envelope', message: '导入文件结构错误：应为对象信封', value: data });
    return { valid: false, errors, warnings, counts: { patients: 0, visits: 0, prescriptions: 0 } };
  }
  if (env.tool !== IMPORT_TOOL) {
    errors.push({ section: 'patients', row: 0, field: 'tool', message: `非本系统导入文件（tool=${String(env.tool)}）`, value: env.tool });
    return { valid: false, errors, warnings, counts: { patients: 0, visits: 0, prescriptions: 0 } };
  }
  if (env.kind !== 'patient-import') {
    errors.push({ section: 'patients', row: 0, field: 'kind', message: '导入文件种类错误（kind 应为 patient-import）', value: env.kind });
    return { valid: false, errors, warnings, counts: { patients: 0, visits: 0, prescriptions: 0 } };
  }

  const patientsIsArray = Array.isArray(env.patients);
  const visitsIsArray = Array.isArray(env.visits);
  const prescriptionsIsArray = Array.isArray(env.prescriptions);
  const rawPatients = patientsIsArray ? (env.patients as unknown[]) : [];
  const rawVisits = visitsIsArray ? (env.visits as unknown[]) : [];
  const rawPrescriptions = prescriptionsIsArray ? (env.prescriptions as unknown[]) : [];

  if (!patientsIsArray) errors.push({ section: 'patients', row: 0, field: 'patients', message: 'patients 应为数组行集，缺失段按空集处理', value: null });
  if (!visitsIsArray) errors.push({ section: 'visits', row: 0, field: 'visits', message: 'visits 应为数组行集，缺失段按空集处理', value: null });
  if (!prescriptionsIsArray) errors.push({ section: 'prescriptions', row: 0, field: 'prescriptions', message: 'prescriptions 应为数组行集，缺失段按空集处理', value: null });

  /* ---- patients：行级校验，同时累积「有效 patientNo 集合」供 visits 挂接 ---- */
  const seenPatientNo = new Set<string>();
  const validPatientNos = new Set<string>();
  rawPatients.forEach((rowRaw, idx) => {
    const rowNo = idx + 1;
    const row = asRecord(rowRaw);
    if (!row) {
      errors.push({ section: 'patients', row: rowNo, field: '@row', message: '该行不是对象记录，整行拒收', value: rowRaw });
      return;
    }
    let rowOk = true;

    const patientNo = asNonEmptyString(row.patientNo);
    if (!patientNo) {
      errors.push({ section: 'patients', row: rowNo, field: 'patientNo', message: 'patientNo 必填（患者唯一标识）', value: row.patientNo });
      rowOk = false;
    } else if (seenPatientNo.has(patientNo)) {
      errors.push({ section: 'patients', row: rowNo, field: 'patientNo', message: `patientNo 重复（${patientNo}），导入包内主键不得重复`, value: patientNo });
      rowOk = false;
    } else {
      seenPatientNo.add(patientNo);
    }

    const name = asNonEmptyString(row.name);
    if (!name) {
      errors.push({ section: 'patients', row: rowNo, field: 'name', message: 'name 必填（患者姓名）', value: row.name });
      rowOk = false;
    }

    const gender = asNonEmptyString(row.gender);
    if (!gender) {
      errors.push({ section: 'patients', row: rowNo, field: 'gender', message: 'gender 必填（男/女/未知）', value: row.gender });
      rowOk = false;
    } else if (!(GENDERS as readonly string[]).includes(gender)) {
      errors.push({ section: 'patients', row: rowNo, field: 'gender', message: `gender 取值非法（${gender}），应为 男/女/未知`, value: gender });
      rowOk = false;
    }

    const birthDate = asNonEmptyString(row.birthDate);
    if (!birthDate) {
      errors.push({ section: 'patients', row: rowNo, field: 'birthDate', message: 'birthDate 必填（yyyy-mm-dd）', value: row.birthDate });
      rowOk = false;
    } else if (!isValidDate(birthDate)) {
      errors.push({ section: 'patients', row: rowNo, field: 'birthDate', message: `birthDate 不是合法日期（${birthDate}），应为 yyyy-mm-dd`, value: birthDate });
      rowOk = false;
    }

    if (rowOk && patientNo) validPatientNos.add(patientNo);
  });

  /* ---- visits：行级校验，挂接有效患者集合，同时累积「有效 visitId 集合」 ---- */
  const seenVisitId = new Set<string>();
  const validVisitIds = new Set<string>();
  rawVisits.forEach((rowRaw, idx) => {
    const rowNo = idx + 1;
    const row = asRecord(rowRaw);
    if (!row) {
      errors.push({ section: 'visits', row: rowNo, field: '@row', message: '该行不是对象记录，整行拒收', value: rowRaw });
      return;
    }
    let rowOk = true;

    const visitId = asNonEmptyString(row.visitId);
    if (!visitId) {
      errors.push({ section: 'visits', row: rowNo, field: 'visitId', message: 'visitId 必填（就诊唯一标识）', value: row.visitId });
      rowOk = false;
    } else if (seenVisitId.has(visitId)) {
      errors.push({ section: 'visits', row: rowNo, field: 'visitId', message: `visitId 重复（${visitId}），导入包内主键不得重复`, value: visitId });
      rowOk = false;
    } else {
      seenVisitId.add(visitId);
    }

    const patientNo = asNonEmptyString(row.patientNo);
    if (!patientNo) {
      errors.push({ section: 'visits', row: rowNo, field: 'patientNo', message: 'patientNo 必填（挂接患者）', value: row.patientNo });
      rowOk = false;
    } else if (!validPatientNos.has(patientNo)) {
      errors.push({ section: 'visits', row: rowNo, field: 'patientNo', message: `patientNo（${patientNo}）在本包患者行中不存在或该行已被拒收`, value: patientNo });
      rowOk = false;
    }

    const visitType = asNonEmptyString(row.visitType);
    if (!visitType) {
      errors.push({ section: 'visits', row: rowNo, field: 'visitType', message: 'visitType 必填（outpatient/inpatient/emergency）', value: row.visitType });
      rowOk = false;
    } else if (!(VISIT_TYPES as readonly string[]).includes(visitType)) {
      errors.push({ section: 'visits', row: rowNo, field: 'visitType', message: `visitType 取值非法（${visitType}）`, value: visitType });
      rowOk = false;
    }

    const deptName = asNonEmptyString(row.deptName);
    if (!deptName) {
      errors.push({ section: 'visits', row: rowNo, field: 'deptName', message: 'deptName 必填（就诊科室）', value: row.deptName });
      rowOk = false;
    }

    const visitDate = asNonEmptyString(row.visitDate);
    if (!visitDate) {
      errors.push({ section: 'visits', row: rowNo, field: 'visitDate', message: 'visitDate 必填（yyyy-mm-dd）', value: row.visitDate });
      rowOk = false;
    } else if (!isValidDate(visitDate)) {
      errors.push({ section: 'visits', row: rowNo, field: 'visitDate', message: `visitDate 不是合法日期（${visitDate}）`, value: visitDate });
      rowOk = false;
    }

    if (rowOk && visitId) validVisitIds.add(visitId);
  });

  /* ---- prescriptions：行级校验，挂接有效就诊集合 ---- */
  const seenRxId = new Set<string>();
  rawPrescriptions.forEach((rowRaw, idx) => {
    const rowNo = idx + 1;
    const row = asRecord(rowRaw);
    if (!row) {
      errors.push({ section: 'prescriptions', row: rowNo, field: '@row', message: '该行不是对象记录，整行拒收', value: rowRaw });
      return;
    }

    const prescriptionId = asNonEmptyString(row.prescriptionId);
    if (!prescriptionId) {
      errors.push({ section: 'prescriptions', row: rowNo, field: 'prescriptionId', message: 'prescriptionId 必填（处方唯一标识）', value: row.prescriptionId });
    } else if (seenRxId.has(prescriptionId)) {
      errors.push({ section: 'prescriptions', row: rowNo, field: 'prescriptionId', message: `prescriptionId 重复（${prescriptionId}），导入包内主键不得重复`, value: prescriptionId });
    } else {
      seenRxId.add(prescriptionId);
    }

    const visitId = asNonEmptyString(row.visitId);
    if (!visitId) {
      errors.push({ section: 'prescriptions', row: rowNo, field: 'visitId', message: 'visitId 必填（挂接就诊）', value: row.visitId });
    } else if (!validVisitIds.has(visitId)) {
      errors.push({ section: 'prescriptions', row: rowNo, field: 'visitId', message: `visitId（${visitId}）在本包就诊行中不存在或该行已被拒收`, value: visitId });
    }

    const drugName = asNonEmptyString(row.drugName);
    if (!drugName) {
      errors.push({ section: 'prescriptions', row: rowNo, field: 'drugName', message: 'drugName 必填（药品名称）', value: row.drugName });
    }

    if (row.quantity !== undefined && row.quantity !== null && typeof row.quantity !== 'number') {
      warnings.push({ section: 'prescriptions', row: rowNo, field: 'quantity', message: 'quantity 应为数字，已按原值保留', value: row.quantity });
    }
  });

  // 信封级错误（row=0）不计入「整包有效」判断：三段行集结构缺失按空集放行，
  // 真正阻断的是 tool/kind 不符（已在上方提前 return）。
  const rowErrors = errors.filter((e) => e.row > 0);
  return {
    valid: rowErrors.length === 0,
    errors,
    warnings,
    counts: {
      patients: rawPatients.length,
      visits: rawVisits.length,
      prescriptions: rawPrescriptions.length,
    },
  };
}

/* ----------------------------------------------------------------------------
 * importPatientData（纯函数）
 * -------------------------------------------------------------------------- */

/**
 * importPatientData：解析并校验导入文件，产出可回灌的干净行集与拒收清单。
 *
 * 接受 JSON 字符串或已解析对象；JSON 语法错误 / 信封级结构错误抛 Error
 * （路由层捕获后返回 400）。行级问题不抛异常——整行剔除进入 rejected，
 * 其余行照常受理，由前端结果页展示「收多少 / 拒多少 / 为什么」。
 *
 * @param jsonData 导入文件内容（JSON 字符串或对象）
 * @returns        受理结果（accepted / rejected / counts / validation）
 * @throws         JSON 非法、信封缺失或 tool/kind 不符时抛出可读中文错误
 */
export function importPatientData(jsonData: string | unknown): ImportResult {
  let parsed: unknown;
  if (typeof jsonData === 'string') {
    const text = jsonData.trim();
    if (!text) throw new Error('导入文件内容为空');
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('导入文件不是合法 JSON');
    }
  } else {
    parsed = jsonData;
  }

  // 信封级硬校验（tool/kind）失败 -> 抛错；行级问题 -> 走 ValidationResult
  const env = asRecord(parsed);
  if (!env) throw new Error('导入文件结构错误：应为对象信封');
  if (env.tool !== IMPORT_TOOL) throw new Error(`非本系统导入文件（tool=${String(env.tool)}）`);
  if (env.kind !== 'patient-import') throw new Error('导入文件种类错误（kind 应为 patient-import）');

  const validation = validateImportData(parsed);

  // 逐行分拣：无任何行级 error 命中的行进入 accepted
  const rowErrorKeys = new Set(validation.errors.filter((e) => e.row > 0).map((e) => `${e.section}:${e.row}`));

  const acceptPatients: PatientRecord[] = [];
  const acceptVisits: VisitRecord[] = [];
  const acceptPrescriptions: PrescriptionRecord[] = [];

  const rawPatients = Array.isArray(env.patients) ? (env.patients as unknown[]) : [];
  const rawVisits = Array.isArray(env.visits) ? (env.visits as unknown[]) : [];
  const rawPrescriptions = Array.isArray(env.prescriptions) ? (env.prescriptions as unknown[]) : [];

  rawPatients.forEach((rowRaw, idx) => {
    if (rowErrorKeys.has(`patients:${idx + 1}`)) return;
    acceptPatients.push(rowRaw as PatientRecord);
  });
  rawVisits.forEach((rowRaw, idx) => {
    if (rowErrorKeys.has(`visits:${idx + 1}`)) return;
    acceptVisits.push(rowRaw as VisitRecord);
  });
  rawPrescriptions.forEach((rowRaw, idx) => {
    if (rowErrorKeys.has(`prescriptions:${idx + 1}`)) return;
    acceptPrescriptions.push(rowRaw as PrescriptionRecord);
  });

  return {
    tool: IMPORT_TOOL,
    version: typeof env.version === 'string' ? env.version : IMPORT_VERSION,
    importedAt: new Date().toISOString(),
    accepted: { patients: acceptPatients, visits: acceptVisits, prescriptions: acceptPrescriptions },
    rejected: validation.errors.filter((e) => e.row > 0),
    counts: {
      patients: acceptPatients.length,
      visits: acceptVisits.length,
      prescriptions: acceptPrescriptions.length,
      rejectedRows: rowErrorKeys.size,
    },
    validation,
  };
}
