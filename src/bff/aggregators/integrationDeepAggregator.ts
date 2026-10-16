/**
 * 健澜科技 jlmedaios — 【系统集成深化·二期】标准接口扩展聚合器（纯函数，M174-B）
 *
 * 【质量与合规】本模块是院内外系统「深度集成」的标准化转换与校验层，
 * 严格遵循现行国际/行业标准，不自创格式：
 *
 *   1. HL7 v2.x（2.5.1）扩展触发事件：
 *        ADT^A08  患者信息更新（PID 人口学/地址/联系方式变更通知）
 *        ORM^O02  医嘱修改（ORC-1 订单控制 ^O02 = 既有医嘱修订/换号）
 *        ORU^R30  观察结果上传（检验仪器 -> LIS -> 院端，双向通信上行）
 *      分隔符沿用 MSH-2 标准：字段 |、组件 ^、重复 ~、转义 \、子组件 &。
 *
 *   2. FHIR R4 标准资源：
 *        Patient             — identifier / name(HumanName) / gender / birthDate
 *        Encounter           — status / class / subject / period / serviceProvider
 *        Observation         — status / code(LOINC) / subject / valueQuantity(UCUM)
 *        MedicationRequest   — status / intent / medicationCodeableConcept(ATC)
 *        Condition           — clinicalStatus / code(ICD-10) / subject / onset
 *
 *   3. DICOM 3.0 影像设备对接：C-STORE 归档 / C-FIND 检索 / C-MOVE 调阅，
 *      按 SOP Class UID 与 modality 做接入校验。
 *
 *   4. LIS 检验仪器双向通信：主机查询医嘱（query_host）/ 仪器结果上行
 *      （upload_result），协议 ASTM E1394(L2) 或 HL7 ORU^R30。
 *
 * 全部无副作用、不触库、不发网络请求，便于单测；数据库读写由路由层负责。
 * 医疗安全红线：本层仅做格式解析、资源装配与标准合规校验，不依据解析
 *   结果触发任何诊疗行为。
 *
 * 「持续优化与新场景」：后续新增 HL7 触发事件 / FHIR 资源 / DICOM SOP 类
 *   时，仅需在 DEEP_SUPPORTED_* 白名单与 buildFHIRR4/validate 分支登记，
 *   路由与前端零改动。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ============================== 类型定义 ============================== */

/** 集成协议族（本模块承诺对接的四类标准通道） */
export type IntegrationStandard = 'hl7v2x' | 'fhir-r4' | 'dicom' | 'lis';

/** FHIR R4 标准资源类型（深度扩展在原 Patient/Observation/MedicationRequest 上新增 Encounter/Condition） */
export type FHIRR4ResourceType =
  | 'Patient'
  | 'Encounter'
  | 'Observation'
  | 'MedicationRequest'
  | 'Condition';

/** HL7 v2.x 分隔符集合（由 MSH-1 / MSH-2 推导，默认标准值 |^~\&） */
export interface DeepDelimiters {
  field: string;
  component: string;
  repetition: string;
  escape: string;
  subcomponent: string;
}

/** 单个 HL7 段 */
export interface DeepSegment {
  /** 段名：MSH / EVN / PID / PV1 / ORC / OBR / OBX ... */
  name: string;
  /** 字段数组，下标与 HL7 字段号对齐（1-based，fields[0] 保留不用） */
  fields: Array<{ raw: string; matrix: string[][][] } | undefined>;
}

/** 从 OBX 段提取的一条观察结果（ORU^R30） */
export interface DeepObservation {
  /** 检验项目代码（OBX-3.1，LOINC） */
  code: string;
  /** 检验项目名称（OBX-3.2） */
  display: string;
  /** 结果值（OBX-5） */
  value: string;
  /** 单位（OBX-6，UCUM） */
  unit: string;
  /** 结果时间（OBX-14，ISO） */
  effectiveDateTime: string;
}

/** 从 ORC/OBR 段提取的一条医嘱（ORM^O02 为「修改」语义） */
export interface DeepOrder {
  /** 订单控制（ORC-1）：XO = 修订 / XX = 停止 */
  orderControl: string;
  /** 医嘱号（ORC-2，placer order number） */
  orderNumber: string;
  /** 医嘱项目代码（OBR-4.1） */
  code: string;
  /** 医嘱项目名称（OBR-4.2） */
  display: string;
  /** 修订时间（ORC-9，ISO） */
  authoredOn: string;
}

/** parseHL7v2x 解析结果（深度扩展事件集） */
export interface DeepParsedMessage {
  /** 完整消息事件（MSH-9），如 ADT^A08 */
  messageEvent: string;
  /** 消息类型（MSH-9.1）：ADT / ORM / ORU */
  messageType: string;
  /** 触发事件（MSH-9.2）：A08 / O02 / R30 */
  triggerEvent: string;
  /** 消息控制号（MSH-10），去重/重传唯一键 */
  messageControlId: string;
  /** 发送方应用（MSH-3） */
  sendingApplication: string;
  /** 消息时间（MSH-7，ISO） */
  messageDateTime: string;
  /** 患者标识（PID-3.1，MRN） */
  patientId: string;
  /** 患者姓名（PID-5，family^given） */
  patientName: string;
  /** 性别（PID-8：M/F/O/U） */
  administrativeSex: string;
  /** 出生日期（PID-7，ISO 日期） */
  dateTimeOfBirth: string;
  /** 患者住址（PID-11，ADT^A08 人口学更新关键字段） */
  patientAddress: string;
  /** 住宅电话（PID-13） */
  homePhone: string;
  /** 就诊号（PV1-19，对应 FHIR Encounter.id） */
  visitNumber: string;
  /** 段列表（保留原始结构供审计回放） */
  segments: DeepSegment[];
  /** 观察结果列表（ORU^R30 的 OBX 段） */
  observations: DeepObservation[];
  /** 医嘱列表（ORM^O02 的 ORC/OBR 段，带修改语义） */
  orders: DeepOrder[];
  /** 解析错误（不符合 HL7 结构时填充，不抛异常） */
  errors: string[];
}

/** FHIR R4 资源（标准结构，resourceType 固定） */
export interface DeepFHIRResource {
  resourceType: FHIRR4ResourceType;
  id?: string;
  [key: string]: unknown;
}

/** buildFHIRR4 — Patient 入参 */
export interface DeepPatientData {
  id?: string;
  identifier?: string;
  identifierSystem?: string;
  familyName?: string;
  givenNames?: string[];
  gender?: string;
  birthDate?: string;
}

/** buildFHIRR4 — Encounter 入参 */
export interface DeepEncounterData {
  id?: string;
  /** planned / in-progress / finished / cancelled，默认 finished */
  status?: string;
  /** 就诊分类代码，默认 IMP（住院） */
  encounterClass?: string;
  encounterClassDisplay?: string;
  patientId?: string;
  periodStart?: string;
  periodEnd?: string;
  serviceProvider?: string;
}

/** buildFHIRR4 — Observation 入参 */
export interface DeepObservationData {
  id?: string;
  status?: string;
  code?: string;
  codeDisplay?: string;
  patientId?: string;
  effectiveDateTime?: string;
  value?: number | string;
  unit?: string;
  valueText?: string;
}

/** buildFHIRR4 — MedicationRequest 入参 */
export interface DeepMedicationData {
  id?: string;
  status?: string;
  intent?: string;
  medicationCode?: string;
  medicationDisplay?: string;
  patientId?: string;
  authoredOn?: string;
}

/** buildFHIRR4 — Condition 入参（ICD-10 诊断） */
export interface DeepConditionData {
  id?: string;
  /** active / recurrence / inactive / resolved，默认 active */
  clinicalStatus?: string;
  /** ICD-10 诊断代码 */
  conditionCode?: string;
  conditionDisplay?: string;
  patientId?: string;
  onsetDateTime?: string;
}

/** DICOM 影像设备对接描述符（校验用，非 DICOM 二进制解析） */
export interface DICOMStudyDescriptor {
  /** SOP Class UID（须形如 1.2.840.10008.5.1.4.1.1.x） */
  sopClassUid?: string;
  /** 设备 modality：CT / MR / US / DR / DX... */
  modality?: string;
  studyInstanceUid?: string;
  patientId?: string;
}

/** LIS 检验仪器双向通信通道描述符（校验用） */
export interface LISChannelDescriptor {
  /** LIS 主机地址/应用名 */
  host?: string;
  /** 检验仪器代码（物理仪器编号） */
  instrumentCode?: string;
  instrumentName?: string;
  /** 是否双向（必须为 true 才算双向通道） */
  bidirectional?: boolean;
  /** 支持的主机查询项：order_query / result_upload / sample_status */
  supportedQueries?: string[];
}

/** validateIntegrationMessage 统一校验结果 */
export interface DeepValidationResult {
  /** 是否通过全部标准合规校验 */
  valid: boolean;
  /** 被校验的标准 */
  standard: IntegrationStandard;
  /** 未通过项说明（通过时为空数组） */
  errors: string[];
}

/** buildDeepIntegration 能力描述符（对外宣告本平台支持的标准集成面） */
export interface DeepIntegrationCapability {
  /** 模块版本标识 */
  module: string;
  /** 合规声明 */
  compliance: string;
  /** 支持的协议族清单 */
  standards: Array<{
    code: IntegrationStandard;
    version: string;
    /** 业务事件 / 资源 / SOP / 仪器能力明细 */
    detail: string;
  }>;
  /** HL7 v2.x 扩展触发事件白名单 */
  hl7Events: readonly string[];
  /** FHIR R4 支持资源白名单 */
  fhirResources: readonly FHIRR4ResourceType[];
  /** DICOM 标准 SOP Class 白名单（UID -> 名称） */
  dicomSopClasses: ReadonlyArray<{ uid: string; name: string }>;
  /** LIS 双向通信方向 */
  lisDirections: string[];
}

/* ============================== 常量 ============================== */

/** 默认 HL7 v2.x 分隔符（MSH-2 标准值） */
const DEFAULT_DELIM: DeepDelimiters = {
  field: '|',
  component: '^',
  repetition: '~',
  escape: '\\',
  subcomponent: '&',
};

/** 合法的 HL7 扩展触发事件白名单（本模块承诺支持的 3 类深度事件） */
export const DEEP_SUPPORTED_EVENTS = ['ADT^A08', 'ORM^O02', 'ORU^R30'] as const;

/** FHIR R4 支持资源白名单 */
export const DEEP_FHIR_RESOURCES: readonly FHIRR4ResourceType[] = [
  'Patient',
  'Encounter',
  'Observation',
  'MedicationRequest',
  'Condition',
];

/**
 * DICOM 标准 SOP Class UID 白名单（DICOM PS3.6）。
 * 「持续优化与新场景」：新增影像设备类型时在此登记 UID 即可。
 */
export const DEEP_DICOM_SOP_CLASSES: ReadonlyArray<{ uid: string; name: string }> = [
  { uid: '1.2.840.10008.5.1.4.1.1.2', name: 'CT Image Storage' },
  { uid: '1.2.840.10008.5.1.4.1.1.4', name: 'MR Image Storage' },
  { uid: '1.2.840.10008.5.1.4.1.1.6.1', name: 'US Image Storage' },
  { uid: '1.2.840.10008.5.1.4.1.1.1.1', name: 'CR/DX Image Storage' },
  { uid: '1.2.840.10008.5.1.4.1.1.7', name: 'Secondary Capture' },
];

/** 合法 DICOM modality 白名单（常用放射设备） */
export const DEEP_DICOM_MODALITIES = ['CT', 'MR', 'US', 'DR', 'DX', 'CR', 'XA', 'MG'] as const;

/** LIS 双向通信合法方向 */
export const DEEP_LIS_DIRECTIONS = ['query_host', 'upload_result'] as const;

/** FHIR R4 各资源必填字段点路径（Must Support） */
const FHIR_REQUIRED: Record<FHIRR4ResourceType, string[]> = {
  Patient: ['resourceType', 'name'],
  Encounter: ['resourceType', 'status', 'subject'],
  Observation: ['resourceType', 'status', 'code', 'subject'],
  MedicationRequest: ['resourceType', 'status', 'intent', 'subject'],
  Condition: ['resourceType', 'clinicalStatus', 'code', 'subject'],
};

/* ============================== 内部工具 ============================== */

/** 按分隔符拆分并构建三维矩阵 repetitions[r][c][s] */
function buildMatrix(raw: string, delim: DeepDelimiters): string[][][] {
  if (raw === undefined || raw === null) return [];
  const repetitions = String(raw).split(delim.repetition);
  return repetitions.map((rep) => rep.split(delim.component).map((comp) => comp.split(delim.subcomponent)));
}

/** 读取某段某字段的某组件某子组件字符串（1-based；越界返回空串） */
function readComponent(seg: DeepSegment, fieldNo: number, compNo = 1, subNo = 1): string {
  const f = seg.fields[fieldNo];
  if (!f || f.matrix.length === 0) return '';
  const rep = f.matrix[0];
  if (!rep || rep.length < compNo) return '';
  const comp = rep[compNo - 1];
  if (!comp || comp.length < subNo) return '';
  return comp[subNo - 1] ?? '';
}

/** 读取字段原始串（未反转义） */
function readRaw(seg: DeepSegment, fieldNo: number): string {
  return seg.fields[fieldNo]?.raw ?? '';
}

/** HL7 反转义：\F\| \S\^ \T\& \R\~ \E\\ \.br\ 换行 */
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

/** HL7 日期时间（YYYYMMDD[HH[MM[SS]]]）转 ISO；非法返回空串 */
export function hl7DateTimeToIso(raw: string): string {
  const v = (raw ?? '').trim();
  if (!/^\d{8,14}$/.test(v)) return '';
  const date = `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  if (v.length <= 8) return date;
  return `${date}T${v.slice(8, 10) || '00'}:${v.slice(10, 12) || '00'}:${v.slice(12, 14) || '00'}`;
}

/** HL7 性别代码 -> FHIR administrativeGender */
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

/** 按点路径安全取值（FHIR 资源必填校验用） */
function getByPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined || typeof acc !== 'object') return undefined;
    return (acc as Record<string, unknown>)[key];
  }, obj);
}

/* ============================== 核心纯函数 1：深度集成能力宣告 ============================== */

/**
 * 构建「深度系统集成」能力描述符。
 *
 * 纯函数：无入参、无副作用、返回值恒定（能力清单为标准承诺，不随时间漂移）。
 * 供接口测试页 / 前端控制台渲染「本平台对接了哪些标准通道」，也作为
 * 互联互通成熟度测评时的接口能力自证清单。
 */
export function buildDeepIntegration(): DeepIntegrationCapability {
  return {
    module: 'M174-B integration-deep',
    compliance: '严格遵循现行国际/行业标准（HL7 v2.5.1 / FHIR R4 / DICOM 3.0 / ASTM L2），不自创格式',
    standards: [
      { code: 'hl7v2x', version: '2.5.1', detail: 'ADT^A08 患者信息更新 / ORM^O02 医嘱修改 / ORU^R30 观察结果上传' },
      { code: 'fhir-r4', version: 'R4', detail: 'Patient / Encounter / Observation / MedicationRequest / Condition' },
      { code: 'dicom', version: '3.0', detail: 'C-STORE 归档 / C-FIND 检索 / C-MOVE 调阅（按 SOP Class UID 校验）' },
      { code: 'lis', version: 'ASTM E1394(L2)', detail: '检验仪器双向：主机查询医嘱 query_host / 仪器结果上行 upload_result' },
    ],
    hl7Events: DEEP_SUPPORTED_EVENTS,
    fhirResources: DEEP_FHIR_RESOURCES,
    dicomSopClasses: DEEP_DICOM_SOP_CLASSES,
    lisDirections: [...DEEP_LIS_DIRECTIONS],
  };
}

/* ============================== 核心纯函数 2：HL7 v2.x 深度解析 ============================== */

/**
 * 解析 HL7 v2.x 深度扩展报文（ADT^A08 / ORM^O02 / ORU^R30）。
 *
 * @param rawMessage 原始 HL7 报文，段间以 0x0D 分隔（兼容 0x0A）
 * @returns 结构化解析结果；结构不合规时 errors 非空，但仍返回已能解析部分（不抛异常）
 */
export function parseHL7v2x(rawMessage: string): DeepParsedMessage {
  const errors: string[] = [];
  const result: DeepParsedMessage = {
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
    patientAddress: '',
    homePhone: '',
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

  // 分段：统一 \r\n / \n -> \r
  const normalized = rawMessage.replace(/\r\n/g, '\r').replace(/\n/g, '\r');
  const rawSegments = normalized.split('\r').map((s) => s.trim()).filter((s) => s.length > 0);
  if (rawSegments.length === 0) {
    errors.push('未识别到任何 HL7 段');
    return result;
  }
  if (!rawSegments[0].startsWith('MSH')) {
    errors.push('HL7 报文必须以 MSH 段开头');
    return result;
  }

  // 从 MSH 推导出分隔符
  const firstBar = rawSegments[0].indexOf('|');
  if (firstBar < 0) {
    errors.push('MSH 段缺少字段分隔符 |');
    return result;
  }
  const mshBody = rawSegments[0].slice(firstBar + 1);
  const delim: DeepDelimiters = { ...DEFAULT_DELIM };
  if (mshBody.length >= 4) {
    delim.component = mshBody[0];
    delim.repetition = mshBody[1];
    delim.escape = mshBody[2];
    delim.subcomponent = mshBody[3];
  } else if (mshBody.length > 0) {
    errors.push('MSH-2 编码字符不完整，回退默认分隔符 |^~\\&');
  }

  // 逐段构建（MSH 段字段号偏移对齐）
  const segments: DeepSegment[] = rawSegments.map((rawSeg) => {
    const parts = rawSeg.split(delim.field);
    const name = parts[0] ?? '';
    const fields: DeepSegment['fields'] = [];
    const isMsh = name === 'MSH';
    for (let i = 1; i < parts.length; i++) {
      const fieldNo = isMsh ? i + 1 : i;
      fields[fieldNo] = { raw: parts[i] ?? '', matrix: buildMatrix(parts[i] ?? '', delim) };
    }
    return { name, fields };
  });
  result.segments = segments;

  const msh = segments.find((s) => s.name === 'MSH');
  if (!msh) {
    errors.push('未找到 MSH 段');
    return result;
  }

  // MSH-9 = 消息类型^触发事件
  const [msgType, trigger] = readRaw(msh, 9).split(delim.component);
  result.messageType = unescapeHL7(msgType ?? '').trim();
  result.triggerEvent = unescapeHL7(trigger ?? '').trim();
  result.messageEvent = `${result.messageType}^${result.triggerEvent}`;
  result.messageControlId = unescapeHL7(readRaw(msh, 10)).trim();
  result.sendingApplication = unescapeHL7(readComponent(msh, 3)).trim();
  result.messageDateTime = hl7DateTimeToIso(readRaw(msh, 7));

  // 深度事件白名单校验
  if (!(DEEP_SUPPORTED_EVENTS as readonly string[]).includes(result.messageEvent)) {
    errors.push(`不支持的深度集成消息事件 ${result.messageEvent}（支持：${DEEP_SUPPORTED_EVENTS.join(' / ')}）`);
  }

  // PID 段（三类事件均带患者上下文）
  const pid = segments.find((s) => s.name === 'PID');
  if (pid) {
    result.patientId = unescapeHL7(readComponent(pid, 3, 1)).trim();
    const family = unescapeHL7(readComponent(pid, 5, 1)).trim();
    const given = unescapeHL7(readComponent(pid, 5, 2)).trim();
    result.patientName = [family, given].filter(Boolean).join(' ');
    result.administrativeSex = unescapeHL7(readRaw(pid, 8)).trim();
    result.dateTimeOfBirth = hl7DateTimeToIso(readRaw(pid, 7));
    // ADT^A08：人口学更新关键字段——住址（PID-11.1 街道）与电话（PID-13.1）
    result.patientAddress = unescapeHL7(readComponent(pid, 11, 1)).trim();
    result.homePhone = unescapeHL7(readComponent(pid, 13, 1)).trim();
  }

  // PV1 段：就诊号
  const pv1 = segments.find((s) => s.name === 'PV1');
  if (pv1) {
    result.visitNumber = unescapeHL7(readComponent(pv1, 19, 1)).trim();
  }

  // ORU^R30：检验仪器上行观察结果（OBX）
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

  // ORM^O02：医嘱修改（ORC 订单控制 + OBR 项目）
  if (result.messageType === 'ORM') {
    const orc = segments.find((s) => s.name === 'ORC');
    const orderControl = orc ? unescapeHL7(readRaw(orc, 1)).trim() : '';
    const orderNumber = orc ? unescapeHL7(readComponent(orc, 2, 1)).trim() : '';
    const authoredOn = orc ? hl7DateTimeToIso(readRaw(orc, 9)) || result.messageDateTime : result.messageDateTime;
    for (const seg of segments) {
      if (seg.name !== 'OBR') continue;
      result.orders.push({
        orderControl,
        orderNumber,
        code: unescapeHL7(readComponent(seg, 4, 1)).trim(),
        display: unescapeHL7(readComponent(seg, 4, 2)).trim(),
        authoredOn,
      });
    }
  }

  return result;
}

/* ============================== 核心纯函数 3：FHIR R4 资源装配 ============================== */

/**
 * 依据 FHIR R4 标准结构装配资源（深度扩展 5 类资源）。
 *
 * @param resourceType Patient / Encounter / Observation / MedicationRequest / Condition
 * @param data         结构化入参（按资源类型填充）
 */
export function buildFHIRR4(
  resourceType: FHIRR4ResourceType,
  data:
    | DeepPatientData
    | DeepEncounterData
    | DeepObservationData
    | DeepMedicationData
    | DeepConditionData,
): DeepFHIRResource {
  if (resourceType === 'Patient') {
    const d = data as DeepPatientData;
    const patient: DeepFHIRResource = { resourceType: 'Patient' };
    if (d.id) patient.id = d.id;
    if (d.identifier) {
      patient.identifier = [{ system: d.identifierSystem ?? 'urn:jianlan:mrn', value: d.identifier }];
    }
    const name: Record<string, unknown> = {};
    if (d.familyName) name.family = d.familyName;
    if (d.givenNames && d.givenNames.length > 0) name.given = d.givenNames;
    if (Object.keys(name).length > 0) patient.name = [name];
    if (d.gender) patient.gender = d.gender;
    if (d.birthDate) patient.birthDate = d.birthDate;
    return patient;
  }

  if (resourceType === 'Encounter') {
    const d = data as DeepEncounterData;
    const enc: DeepFHIRResource = {
      resourceType: 'Encounter',
      status: d.status ?? 'finished',
      class: {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
            code: d.encounterClass ?? 'IMP',
            display: d.encounterClassDisplay ?? '住院',
          },
        ],
      },
    };
    if (d.id) enc.id = d.id;
    if (d.patientId) enc.subject = { reference: `Patient/${d.patientId}` };
    const period: Record<string, string> = {};
    if (d.periodStart) period.start = d.periodStart;
    if (d.periodEnd) period.end = d.periodEnd;
    if (Object.keys(period).length > 0) enc.period = period;
    if (d.serviceProvider) enc.serviceProvider = { display: d.serviceProvider };
    return enc;
  }

  if (resourceType === 'Observation') {
    const d = data as DeepObservationData;
    const obs: DeepFHIRResource = {
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
        obs.valueQuantity = { value: num, unit: d.unit, system: 'http://unitsofmeasure.org', code: d.unit };
      } else {
        obs.valueString = String(d.value);
      }
    } else if (d.valueText) {
      obs.valueString = d.valueText;
    }
    return obs;
  }

  if (resourceType === 'MedicationRequest') {
    const d = data as DeepMedicationData;
    const med: DeepFHIRResource = {
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

  // Condition（ICD-10 诊断）
  const d = data as DeepConditionData;
  const cond: DeepFHIRResource = {
    resourceType: 'Condition',
    clinicalStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: d.clinicalStatus ?? 'active',
        },
      ],
    },
    verificationStatus: {
      coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'confirmed' }],
    },
    code: {
      coding: d.conditionCode
        ? [{ system: 'http://hl7.org/fhir/sid/icd-10', code: d.conditionCode, display: d.conditionDisplay ?? d.conditionCode }]
        : [],
      text: d.conditionDisplay ?? d.conditionCode ?? '',
    },
  };
  if (d.id) cond.id = d.id;
  if (d.patientId) cond.subject = { reference: `Patient/${d.patientId}` };
  if (d.onsetDateTime) cond.onsetDateTime = d.onsetDateTime;
  return cond;
}

/* ============================== 核心纯函数 4：跨标准消息校验 ============================== */

/**
 * 按标准族校验一条集成消息是否合规。
 *
 * @param message 原始报文（hl7v2x 传 string）或结构化对象
 *                （fhir-r4 传 buildFHIRR4 产物；dicom/lis 传描述符对象）
 * @param standard 协议族：'hl7v2x' | 'fhir-r4' | 'dicom' | 'lis'
 */
export function validateIntegrationMessage(
  message: unknown,
  standard: IntegrationStandard,
): DeepValidationResult {
  const errors: string[] = [];

  if (standard === 'hl7v2x') {
    const raw = typeof message === 'string' ? message : '';
    if (!raw.trim()) {
      errors.push('HL7 报文为空');
    } else {
      const firstLine = raw.replace(/\r\n/g, '\r').split('\r')[0] ?? '';
      if (!firstLine.startsWith('MSH')) {
        errors.push('HL7 报文必须以 MSH 段开头');
      } else {
        // MSH-9 = 消息类型^触发事件
        const mshFields = firstLine.split('|');
        const msh9 = mshFields[8] ?? ''; // parts: [MSH, ^~\&, ...] -> parts[8] = MSH-9
        const event = msh9.split('^')[0] ? msh9 : '';
        if (!event) {
          errors.push('缺少 MSH-9 消息类型^触发事件');
        } else if (!(DEEP_SUPPORTED_EVENTS as readonly string[]).includes(event)) {
          errors.push(`不支持的深度集成消息事件 ${event}（白名单：${DEEP_SUPPORTED_EVENTS.join(' / ')}）`);
        }
      }
      if (!raw.includes('\n') && !raw.includes('\r')) {
        errors.push('HL7 报文应至少包含 MSH 与一个业务段（PID/PV1/ORC/OBR/OBX）');
      }
    }
    return { valid: errors.length === 0, standard, errors };
  }

  if (standard === 'fhir-r4') {
    if (!message || typeof message !== 'object') {
      return { valid: false, standard, errors: ['FHIR 资源不是合法对象'] };
    }
    const res = message as DeepFHIRResource;
    if (!res.resourceType || !(DEEP_FHIR_RESOURCES as readonly string[]).includes(res.resourceType)) {
      errors.push(`resourceType 非法：${String(res.resourceType)}（白名单：${DEEP_FHIR_RESOURCES.join(' / ')}）`);
      return { valid: false, standard, errors };
    }
    for (const field of FHIR_REQUIRED[res.resourceType]) {
      const v = getByPath(res, field);
      if (v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)) {
        errors.push(`必填字段缺失：${field}`);
      }
    }
    return { valid: errors.length === 0, standard, errors };
  }

  if (standard === 'dicom') {
    const d = (message ?? {}) as DICOMStudyDescriptor;
    if (!d.sopClassUid || !/^1\.2\.840\.10008\./.test(d.sopClassUid)) {
      errors.push('DICOM SOP Class UID 缺失或非标准根（应为 1.2.840.10008.*）');
    }
    if (!d.modality || !(DEEP_DICOM_MODALITIES as readonly string[]).includes(d.modality)) {
      errors.push(`modality 缺失或非标准（白名单：${DEEP_DICOM_MODALITIES.join('/')}）`);
    }
    if (!d.studyInstanceUid) {
      errors.push('studyInstanceUid（研究实例 UID）缺失');
    }
    return { valid: errors.length === 0, standard, errors };
  }

  // lis：检验仪器双向通信通道校验
  const d = (message ?? {}) as LISChannelDescriptor;
  if (!d.host) {
    errors.push('LIS 主机地址 host 缺失');
  }
  if (!d.instrumentCode) {
    errors.push('检验仪器代码 instrumentCode 缺失');
  }
  if (d.bidirectional !== true) {
    errors.push('LIS 通道必须为双向（bidirectional=true）');
  }
  if (!Array.isArray(d.supportedQueries) || d.supportedQueries.length === 0) {
    errors.push('缺少双向能力声明 supportedQueries（order_query/result_upload/...）');
  }
  return { valid: errors.length === 0, standard, errors };
}
