/**
 * 健澜科技 jlmedaios — 【系统集成深化】HL7 v2.x / FHIR R4 接口聚合器（纯函数）
 *
 * 【质量与合规】本模块为院内外系统接口（互联互通 / 电子病历五级）的标准化转换层，
 * 严格遵循现行国际标准，不自创格式：
 *
 *   1. HL7 v2.x 编码规则（MSH-2 定义）：
 *        字段分隔符   |   （field，MSH-1）
 *        组件分隔符   ^   （component，MSH-2 第 1 字符）
 *        重复分隔符   ~   （repetition，MSH-2 第 2 字符）
 *        转义符       \   （escape，MSH-2 第 3 字符）
 *        子组件分隔符 &   （subcomponent，MSH-2 第 4 字符）
 *      分段以回车（0x0D）为界；MSH-9 = 消息类型 ^ 触发事件（如 ADT^A04）。
 *      支持消息类型：ADT^A04 入院登记 / ORM^O01 医嘱下单 /
 *                    ORU^R01 检验结果 / DFT^P03 账单更新。
 *
 *   2. FHIR R4 标准资源结构：
 *        Patient              — identifier / name(HumanName) / gender / birthDate
 *        Observation          — status / code(CodeableConcept) / subject /
 *                               effectiveDateTime / valueQuantity
 *        MedicationRequest    — status / intent / medicationCodeableConcept /
 *                               subject / authoredOn
 *
 * 全部无副作用、不触库、不发网络请求，便于单测；数据库读写由路由层负责。
 * 医疗安全红线：本层仅做格式解析与资源装配，不依据解析结果触发任何诊疗行为。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 类型定义 ============================== */

/** HL7 v2.x 分隔符集合（由 MSH-1 / MSH-2 推导，默认标准值 |^~\&） */
export interface HL7Delimiters {
  /** 字段分隔符 | */
  field: string;
  /** 组件分隔符 ^ */
  component: string;
  /** 重复分隔符 ~ */
  repetition: string;
  /** 转义符 \ */
  escape: string;
  /** 子组件分隔符 & */
  subcomponent: string;
}

/** 单个 HL7 字段的结构化表示 */
export interface HL7FieldValue {
  /** 原始字段字符串（未反转义） */
  raw: string;
  /**
   * 三维矩阵 repetitions[r][c][s]：
   *   r = 重复序号（~），c = 组件序号（^），s = 子组件序号（&）
   * 无重复时 r 恒为 0；无子组件时 s 恒为 0。
   */
  matrix: string[][][];
}

/** 单个 HL7 段 */
export interface HL7Segment {
  /** 段名：MSH / EVN / PID / PV1 / ORC / OBR / OBX / FT1 ... */
  name: string;
  /** 字段数组，下标与 HL7 字段号对齐（1-based，fields[0] 保留不用） */
  fields: Array<HL7FieldValue | undefined>;
}

/** 从 OBX 段提取的一条检验结果 */
export interface ExtractedObservation {
  /** 检验项目代码（OBX-3.1，如 LOINC 代码） */
  code: string;
  /** 检验项目名称（OBX-3.2） */
  display: string;
  /** 结果值（OBX-5） */
  value: string;
  /** 单位（OBX-6） */
  unit: string;
  /** 结果时间（OBX-14，ISO 格式） */
  effectiveDateTime: string;
}

/** 从 ORC/OBR 段提取的一条医嘱/用药请求 */
export interface ExtractedOrder {
  /** 医嘱/项目代码（OBR-4.1） */
  code: string;
  /** 医嘱/项目名称（OBR-4.2） */
  display: string;
  /** 开嘱时间（ORC-9 或 MSH-7，ISO 格式） */
  authoredOn: string;
}

/** HL7 消息解析结果 */
export interface ParsedMessage {
  /** 完整消息事件（MSH-9），如 ADT^A04 */
  messageEvent: string;
  /** 消息类型（MSH-9.1）：ADT / ORM / ORU / DFT */
  messageType: string;
  /** 触发事件（MSH-9.2）：A04 / O01 / R01 / P03 */
  triggerEvent: string;
  /** 消息控制号（MSH-10），全局唯一，用于去重/重传 */
  messageControlId: string;
  /** 发送方应用（MSH-3） */
  sendingApplication: string;
  /** 消息时间（MSH-7，ISO 格式） */
  messageDateTime: string;
  /** 患者标识（PID-3.1，MRN） */
  patientId: string;
  /** 患者姓名（PID-5，family^given） */
  patientName: string;
  /** 性别（PID-8：M/F/O/U） */
  administrativeSex: string;
  /** 出生日期（PID-7，ISO 日期） */
  dateTimeOfBirth: string;
  /** 就诊号（PV1-19） */
  visitNumber: string;
  /** 段列表 */
  segments: HL7Segment[];
  /** 检验结果列表（ORU^R01 的 OBX 段） */
  observations: ExtractedObservation[];
  /** 医嘱列表（ORM^O01 的 OBR 段） */
  orders: ExtractedOrder[];
  /** 解析错误（不符合 HL7 结构时填充） */
  errors: string[];
}

/** FHIR R4 资源（标准结构，resourceType 固定） */
export interface FHIRResource {
  resourceType: 'Patient' | 'Observation' | 'MedicationRequest';
  id?: string;
  [key: string]: unknown;
}

/** buildFHIRResource — Patient 入参 */
export interface PatientBuildData {
  id?: string;
  /** 病历号 MRN */
  identifier?: string;
  /** 标识体系（默认 urn:jianlan:mrn） */
  identifierSystem?: string;
  /** 家庭/姓 */
  familyName?: string;
  /** 名（given） */
  givenNames?: string[];
  /** male / female / other / unknown */
  gender?: string;
  /** YYYY-MM-DD */
  birthDate?: string;
}

/** buildFHIRResource — Observation 入参 */
export interface ObservationBuildData {
  id?: string;
  /** final / amended / registered / preliminary，默认 final */
  status?: string;
  /** LOINC 代码 */
  code?: string;
  codeDisplay?: string;
  /** 引用的患者 Patient/{patientId} */
  patientId?: string;
  /** ISO 时间 */
  effectiveDateTime?: string;
  /** 数值结果（与 valueText 二选一） */
  value?: number | string;
  unit?: string;
  /** 文本结果（非数值时） */
  valueText?: string;
}

/** buildFHIRResource — MedicationRequest 入参 */
export interface MedicationRequestBuildData {
  id?: string;
  /** active / completed / on-hold / stopped，默认 active */
  status?: string;
  /** order / draft / plan，默认 order */
  intent?: string;
  /** 药品代码（ATC 等） */
  medicationCode?: string;
  medicationDisplay?: string;
  patientId?: string;
  /** ISO 时间 */
  authoredOn?: string;
}

/** FHIR R4 校验 schema（必填字段点路径） */
export interface FHIRValidationSchema {
  resourceType: string;
  /** 必填字段点路径，如 ["resourceType","subject.reference","code.coding"] */
  requiredFields: string[];
}

/** 资源校验结果 */
export interface ValidationResult {
  /** 是否通过全部必填校验 */
  valid: boolean;
  /** 未通过的字段说明 */
  errors: string[];
}

/* ============================== 常量 ============================== */

/** 默认 HL7 v2.x 分隔符（MSH-2 标准值） */
export const DEFAULT_DELIMITERS: HL7Delimiters = {
  field: '|',
  component: '^',
  repetition: '~',
  escape: '\\',
  subcomponent: '&',
};

/** FHIR R4 标准校验 schema（依据各资源 Resource 定义的 Must Support 字段） */
export const FHIR_R4_SCHEMAS: Record<'Patient' | 'Observation' | 'MedicationRequest', FHIRValidationSchema> = {
  Patient: {
    resourceType: 'Patient',
    requiredFields: ['resourceType', 'name'],
  },
  Observation: {
    resourceType: 'Observation',
    requiredFields: ['resourceType', 'status', 'code', 'subject'],
  },
  MedicationRequest: {
    resourceType: 'MedicationRequest',
    requiredFields: ['resourceType', 'status', 'intent', 'subject'],
  },
};

/** 合法的消息事件白名单（本模块承诺支持的 4 类） */
export const SUPPORTED_MESSAGE_EVENTS = ['ADT^A04', 'ORM^O01', 'ORU^R01', 'DFT^P03'] as const;

/* ============================== 内部工具 ============================== */

/** 按分隔符拆分并构建三维矩阵 */
function buildMatrix(raw: string, delim: HL7Delimiters): string[][][];
function buildMatrix(raw: string, delim: HL7Delimiters): string[][][] {
  if (raw === undefined || raw === null) return [];
  const repetitions = String(raw).split(delim.repetition);
  return repetitions.map((rep) => {
    const components = rep.split(delim.component);
    return components.map((comp) => comp.split(delim.subcomponent));
  });
}

/** 读取某段某字段的某组件某子组件字符串（1-based；越界返回空串） */
function readComponent(seg: HL7Segment, fieldNo: number, compNo = 1, subNo = 1): string {
  const f = seg.fields[fieldNo];
  if (!f || f.matrix.length === 0) return '';
  const rep = f.matrix[0];
  if (!rep || rep.length < compNo) return '';
  const comp = rep[compNo - 1];
  if (!comp || comp.length < subNo) return '';
  return comp[subNo - 1] ?? '';
}

/** 读取字段原始串（未反转义） */
function readRaw(seg: HL7Segment, fieldNo: number): string {
  return seg.fields[fieldNo]?.raw ?? '';
}

/** HL7 转义反转义：\F\| \S\^ \T\& \R\~ \E\\ \.br\ 换行 */
function unescapeHL7(value: string): string {
  if (!value) return '';
  return value
    .replace(/\\F\\/g, '|')
    .replace(/\\S\\/g, '^')
    .replace(/\\T\\/g, '&')
    .replace(/\\R\\/g, '~')
    .replace(/\\E\\/g, '\\')
    .replace(/\\\.br\\/g, '\n');
}

/** 把 HL7 日期时间（YYYYMMDD[HH[MM[SS]]]）转 ISO 字符串；非法返回空串 */
export function hl7DateTimeToIso(raw: string): string {
  const v = (raw ?? '').trim();
  if (!/^\d{8,14}$/.test(v)) return '';
  const yyyy = v.slice(0, 4);
  const mm = v.slice(4, 6);
  const dd = v.slice(6, 8);
  const date = `${yyyy}-${mm}-${dd}`;
  if (v.length <= 8) return date;
  const hh = v.slice(8, 10) || '00';
  const mi = v.slice(10, 12) || '00';
  const ss = v.slice(12, 14) || '00';
  return `${date}T${hh}:${mi}:${ss}`;
}

/** 把 HL7 性别代码映射为 FHIR administrativeGender */
export function hl7GenderToFhir(gender: string): string {
  switch ((gender ?? '').trim().toUpperCase()) {
    case 'M':
      return 'male';
    case 'F':
      return 'female';
    case 'O':
      return 'other';
    default:
      return 'unknown';
  }
}

/* ============================== 核心纯函数 1：HL7 解析 ============================== */

/**
 * 解析 HL7 v2.x 原始报文为结构化对象。
 *
 * @param rawMessage 原始 HL7 报文，段间以 0x0D 分隔（兼容 0x0A）
 * @returns 解析结果；结构不合规时 errors 非空，但仍返回已能解析的部分（不抛异常）
 */
export function parseHL7Message(rawMessage: string): ParsedMessage {
  const errors: string[] = [];
  const result: ParsedMessage = {
    messageEvent: '',
    messageType: '',
    triggerEvent: '',
    messageControlId: '',
    sendingApplication: '',
    messageDateTime: '',
    patientId: '',
    patientName: '',
    administrativeSex: '',
    dateTimeOfBirth: '',
    visitNumber: '',
    segments: [],
    observations: [],
    orders: [],
    errors,
  };

  if (typeof rawMessage !== 'string' || !rawMessage.trim()) {
    errors.push('HL7 报文为空');
    return result;
  }

  // 分段：优先按 0x0D；无 0x0D 时退回 0x0A，再退回 \n
  const normalized = rawMessage.replace(/\r\n/g, '\r').replace(/\n/g, '\r');
  const rawSegments = normalized.split('\r').map((s) => s.trim()).filter((s) => s.length > 0);

  if (rawSegments.length === 0) {
    errors.push('未识别到任何 HL7 段');
    return result;
  }

  // 首段必须是 MSH（HL7 v2 强制要求）
  if (!rawSegments[0].startsWith('MSH')) {
    errors.push('HL7 报文必须以 MSH 段开头');
    return result;
  }

  // 从 MSH 推导出分隔符：MSH|^~\&|...
  // 第一处 | 之后即 MSH-2（编码字符）：^ = component, ~ = repetition, \ = escape, & = subcomponent
  const firstBar = rawSegments[0].indexOf('|');
  if (firstBar < 0) {
    errors.push('MSH 段缺少字段分隔符 |');
    return result;
  }
  const mshBody = rawSegments[0].slice(firstBar + 1);
  const delim: HL7Delimiters = { ...DEFAULT_DELIMITERS };
  if (mshBody.length >= 4) {
    delim.component = mshBody[0];
    delim.repetition = mshBody[1];
    delim.escape = mshBody[2];
    delim.subcomponent = mshBody[3];
  } else if (mshBody.length > 0) {
    errors.push('MSH-2 编码字符不完整，回退默认分隔符 |^~\\&');
  }

  // 逐段构建
  const segments: HL7Segment[] = rawSegments.map((rawSeg, idx) => {
    const parts = rawSeg.split(delim.field);
    const name = parts[0] ?? '';
    const fields: Array<HL7FieldValue | undefined> = [];
    // MSH 段：parts[1] 是 MSH-2（编码字符），需偏移对齐到字段号 2
    // 非 MSH 段：parts[1] 即第 1 字段
    const isMsh = name === 'MSH';
    for (let i = 1; i < parts.length; i++) {
      const fieldNo = isMsh ? i + 1 : i;
      fields[fieldNo] = { raw: parts[i] ?? '', matrix: buildMatrix(parts[i] ?? '', delim) };
    }
    return { name, fields };
    void idx;
  });
  result.segments = segments;

  // 定位 MSH 段
  const msh = segments.find((s) => s.name === 'MSH');
  if (!msh) {
    errors.push('未找到 MSH 段');
    return result;
  }

  // MSH-9 = 消息类型^触发事件
  const msh9 = readRaw(msh, 9);
  const [msgType, trigger] = msh9.split(delim.component);
  result.messageType = unescapeHL7(msgType ?? '').trim();
  result.triggerEvent = unescapeHL7(trigger ?? '').trim();
  result.messageEvent = `${result.messageType}^${result.triggerEvent}`;

  // MSH-10 = 消息控制号
  result.messageControlId = unescapeHL7(readRaw(msh, 10)).trim();
  // MSH-3 = 发送方应用
  result.sendingApplication = unescapeHL7(readComponent(msh, 3)).trim();
  // MSH-7 = 消息时间
  result.messageDateTime = hl7DateTimeToIso(readRaw(msh, 7));

  // 白名单校验
  if (!(SUPPORTED_MESSAGE_EVENTS as readonly string[]).includes(result.messageEvent)) {
    errors.push(`不支持的消息事件 ${result.messageEvent}（支持：${SUPPORTED_MESSAGE_EVENTS.join(' / ')}）`);
  }

  // PID 段
  const pid = segments.find((s) => s.name === 'PID');
  if (pid) {
    // PID-3.1 = 患者内部 ID（MRN）
    result.patientId = unescapeHL7(readComponent(pid, 3, 1)).trim();
    // PID-5 = 家庭^给定^中间...
    const family = unescapeHL7(readComponent(pid, 5, 1)).trim();
    const given = unescapeHL7(readComponent(pid, 5, 2)).trim();
    result.patientName = [family, given].filter(Boolean).join(' ');
    // PID-8 = 性别
    result.administrativeSex = unescapeHL7(readRaw(pid, 8)).trim();
    // PID-7 = 出生日期
    result.dateTimeOfBirth = hl7DateTimeToIso(readRaw(pid, 7));
  }

  // PV1 段
  const pv1 = segments.find((s) => s.name === 'PV1');
  if (pv1) {
    // PV1-19 = 就诊号
    result.visitNumber = unescapeHL7(readComponent(pv1, 19, 1)).trim();
  }

  // ORU^R01：抽取 OBX 段为观察结果
  if (result.messageType === 'ORU') {
    for (const seg of segments) {
      if (seg.name !== 'OBX') continue;
      result.observations.push({
        code: unescapeHL7(readComponent(seg, 3, 1)).trim(),
        display: unescapeHL7(readComponent(seg, 3, 2)).trim(),
        value: unescapeHL7(readRaw(seg, 5)).trim(),
        unit: unescapeHL7(readRaw(seg, 6)).trim(),
        effectiveDateTime: hl7DateTimeToIso(readRaw(seg, 14)),
      });
    }
  }

  // ORM^O01：抽取 OBR 段为医嘱
  if (result.messageType === 'ORM') {
    const orc = segments.find((s) => s.name === 'ORC');
    const authoredOn = orc ? hl7DateTimeToIso(readRaw(orc, 9)) || result.messageDateTime : result.messageDateTime;
    for (const seg of segments) {
      if (seg.name !== 'OBR') continue;
      result.orders.push({
        code: unescapeHL7(readComponent(seg, 4, 1)).trim(),
        display: unescapeHL7(readComponent(seg, 4, 2)).trim(),
        authoredOn,
      });
    }
  }

  return result;
}

/* ============================== 核心纯函数 2：FHIR 资源装配 ============================== */

/**
 * 依据 FHIR R4 标准结构装配资源。
 *
 * @param resourceType 资源类型：Patient / Observation / MedicationRequest
 * @param data         结构化入参（按资源类型填充）
 */
export function buildFHIRResource(
  resourceType: 'Patient' | 'Observation' | 'MedicationRequest',
  data: PatientBuildData | ObservationBuildData | MedicationRequestBuildData,
): FHIRResource {
  if (resourceType === 'Patient') {
    const d = data as PatientBuildData;
    const patient: FHIRResource = { resourceType: 'Patient' };
    if (d.id) patient.id = d.id;
    if (d.identifier) {
      patient.identifier = [
        {
          system: d.identifierSystem ?? 'urn:jianlan:mrn',
          value: d.identifier,
        },
      ];
    }
    const name: Record<string, unknown> = {};
    if (d.familyName) name.family = d.familyName;
    if (d.givenNames && d.givenNames.length > 0) name.given = d.givenNames;
    if (Object.keys(name).length > 0) patient.name = [name];
    if (d.gender) patient.gender = d.gender;
    if (d.birthDate) patient.birthDate = d.birthDate;
    return patient;
  }

  if (resourceType === 'Observation') {
    const d = data as ObservationBuildData;
    const obs: FHIRResource = {
      resourceType: 'Observation',
      status: d.status ?? 'final',
      code: {
        coding: d.code ? [{ system: 'http://loinc.org', code: d.code, display: d.codeDisplay ?? d.code }] : [],
        text: d.codeDisplay ?? d.code ?? '',
      },
    };
    if (d.id) obs.id = d.id;
    if (d.patientId) obs.subject = { reference: `Patient/${d.patientId}` };
    if (d.effectiveDateTime) obs.effectiveDateTime = d.effectiveDateTime;
    if (typeof d.value === 'number' || (typeof d.value === 'string' && d.value.trim() !== '')) {
      const num = Number(d.value);
      if (!Number.isNaN(num) && d.unit) {
        obs.valueQuantity = {
          value: num,
          unit: d.unit,
          system: 'http://unitsofmeasure.org',
          code: d.unit,
        };
      } else {
        obs.valueString = String(d.value);
      }
    } else if (d.valueText) {
      obs.valueString = d.valueText;
    }
    return obs;
  }

  // MedicationRequest
  const d = data as MedicationRequestBuildData;
  const med: FHIRResource = {
    resourceType: 'MedicationRequest',
    status: d.status ?? 'active',
    intent: d.intent ?? 'order',
    medicationCodeableConcept: {
      coding: d.medicationCode
        ? [{ system: 'http://www.whocc.no/atc', code: d.medicationCode, display: d.medicationDisplay ?? d.medicationCode }]
        : [],
      text: d.medicationDisplay ?? d.medicationCode ?? '',
    },
  };
  if (d.id) med.id = d.id;
  if (d.patientId) med.subject = { reference: `Patient/${d.patientId}` };
  if (d.authoredOn) med.authoredOn = d.authoredOn;
  return med;
}

/* ============================== 核心纯函数 3：FHIR 资源校验 ============================== */

/** 按点路径安全取值 */
function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/**
 * 依据 schema 校验 FHIR R4 资源是否满足必填字段约束。
 *
 * @param resource 装配出的 FHIR 资源
 * @param schema   校验 schema（可传 FHIR_R4_SCHEMAS[resourceType]）
 */
export function validateFHIRResource(resource: FHIRResource, schema: FHIRValidationSchema): ValidationResult {
  const errors: string[] = [];

  if (!resource || typeof resource !== 'object') {
    return { valid: false, errors: ['资源不是合法对象'] };
  }
  if (resource.resourceType !== schema.resourceType) {
    errors.push(`resourceType 不匹配：期望 ${schema.resourceType}，实际 ${String(resource.resourceType)}`);
  }

  for (const field of schema.requiredFields) {
    const v = getByPath(resource, field);
    if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
      errors.push(`必填字段缺失：${field}`);
    }
  }

  return { valid: errors.length === 0, errors };
}
