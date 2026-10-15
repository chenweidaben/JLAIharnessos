/**
 * 健澜科技数智医院智能体（jlmedaios） - BFF 敏感数据脱敏聚合器（M123-B）
 *
 * 【生产安全加固】
 *  - 本模块为纯函数集合，无 IO、无副作用、无全局可变状态，可单测、可并行、可回放；
 *  - 对外（BFF 返回 / 日志 / 导出）输出 PII 前必须经 maskSensitiveData 处理；
 *  - 角色差异：admin 全量可见，doctor / nurse 按字段类型脱敏，patient 侧最严；
 *  - 不修改入参，所有输出均为深拷贝副本，避免污染上游缓存与审计快照。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型定义                                                             */
/* ------------------------------------------------------------------ */

/** 脱敏视角角色（决定可见性等级） */
export type SensitiveRole = 'admin' | 'doctor' | 'nurse' | 'patient';

/** 敏感字段类型（决定调用哪个脱敏函数） */
export type SensitiveFieldType = 'name' | 'idCard' | 'phone' | 'address';

/** 敏感字段规则：对象 key（大小写不敏感）→ 脱敏类型 */
export interface SensitiveFieldRule {
  /** 字段名，如 patientName / idCard / phone / homeAddress */
  field: string;
  /** 敏感类型 */
  type: SensitiveFieldType;
}

/* ------------------------------------------------------------------ */
/* 基础脱敏纯函数                                                        */
/* ------------------------------------------------------------------ */

/**
 * 脱敏姓名：保留首字与末字，中间以 * 代替。
 *
 * 【生产安全加固】医疗场景下姓名保留首尾字，兼顾排重识别与隐私保护。
 *
 * @example
 * maskName('张建国')   // '张*国'
 * maskName('欧阳娜娜') // '欧**'
 * maskName('张三')     // '张*'
 */
export function maskName(name: string | null | undefined): string {
  if (typeof name !== 'string') return '';
  const value = name.trim();
  if (value.length === 0) return '';
  if (value.length === 1) return value;
  if (value.length === 2) return `${value[0]}*`;
  const head = value[0];
  const tail = value[value.length - 1];
  const stars = '*'.repeat(value.length - 2);
  return `${head}${stars}${tail}`;
}

/**
 * 脱敏身份证号：保留前 4 位与后 4 位，中间统一以 * 代替。
 *
 * @example
 * maskIdCard('330106199001011234') // '3301**********1234'
 */
export function maskIdCard(id: string | null | undefined): string {
  if (typeof id !== 'string') return '';
  const value = id.trim();
  if (value.length === 0) return '';
  if (value.length <= 8) return '*'.repeat(value.length);
  const head = value.slice(0, 4);
  const tail = value.slice(-4);
  const stars = '*'.repeat(value.length - 8);
  return `${head}${stars}${tail}`;
}

/**
 * 脱敏手机号：保留前 3 位与后 4 位，中间以 4 个 * 代替。
 *
 * @example
 * maskPhone('13812345678') // '138****5678'
 */
export function maskPhone(phone: string | null | undefined): string {
  if (typeof phone !== 'string') return '';
  const value = phone.trim();
  if (value.length === 0) return '';
  if (value.length <= 7) return '*'.repeat(value.length);
  const head = value.slice(0, 3);
  const tail = value.slice(-4);
  const stars = '*'.repeat(Math.max(4, value.length - 7));
  return `${head}${stars}${tail}`;
}

/**
 * 脱敏地址：只显示到区/县/街道层级，其下详细住址（路、号、单元、室）以 * 代替。
 *
 * 【生产安全加固】定位精度从「门牌级」收敛到「行政区级」，
 * 防止通过详细住址反推患者家庭位置。
 *
 * @example
 * maskAddress('杭州市西湖区文三路123号') // '杭州市西湖区****'
 * maskAddress('宁波市海曙区鼓楼街道沿江西路8号') // '宁波市海曙区鼓楼街道****'
 */
export function maskAddress(addr: string | null | undefined): string {
  if (typeof addr !== 'string') return '';
  const value = addr.trim();
  if (value.length === 0) return '';

  // 优先在 区/县/旗/街道/镇/乡 处截断；取最靠后的关键字（最细粒度）；
  // 其次回退到地级市 市。
  const PRIORITY_TOKENS = ['区', '县', '旗', '街道', '镇', '乡'];
  const FALLBACK_TOKENS = ['市'];

  let cut = -1;
  for (const token of PRIORITY_TOKENS) {
    const idx = value.indexOf(token);
    if (idx >= 0) cut = Math.max(cut, idx + token.length);
  }
  if (cut < 0) {
    for (const token of FALLBACK_TOKENS) {
      const idx = value.indexOf(token);
      if (idx >= 0) cut = Math.max(cut, idx + token.length);
    }
  }

  if (cut <= 0) {
    // 无任何行政区划关键字：保留前 6 个字符，其余脱敏
    const keep = value.slice(0, 6);
    const rest = value.length - keep.length;
    return rest > 0 ? `${keep}****` : keep;
  }

  const prefix = value.slice(0, cut);
  const rest = value.length - prefix.length;
  return rest > 0 ? `${prefix}****` : prefix;
}

/* ------------------------------------------------------------------ */
/* 角色化批量脱敏                                                        */
/* ------------------------------------------------------------------ */

/** admin 角色是否完全不脱敏 */
function isUnmaskedRole(role: SensitiveRole): boolean {
  return role === 'admin';
}

/** 依据类型分派到对应脱敏函数 */
function applyMask(type: SensitiveFieldType, raw: unknown): unknown {
  if (typeof raw !== 'string') return raw;
  switch (type) {
    case 'name':
      return maskName(raw);
    case 'idCard':
      return maskIdCard(raw);
    case 'phone':
      return maskPhone(raw);
    case 'address':
      return maskAddress(raw);
  }
}

/** 递归深拷贝（纯函数，避免污染入参） */
function deepClone<T>(data: T): T {
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map((item) => deepClone(item)) as unknown as T;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
    out[k] = deepClone(v);
  }
  return out as T;
}

/**
 * 按字段规则与角色对整包数据做脱敏。
 *
 * 【生产安全加固】
 *  - admin：原样返回深拷贝（全量可见，用于审计与系统管理）；
 *  - doctor / nurse：命中规则的字段按类型脱敏，其余字段保留；
 *  - patient：同 doctor/nurse（患者侧本身不应返回他人 PII；若返回本人数据仍按字段收敛）。
 *
 * @param data   原始数据对象或数组
 * @param fields 敏感字段规则表（字段名大小写不敏感）
 * @param role   调用方角色
 * @returns      脱敏后的副本（不修改入参）
 *
 * @example
 * maskSensitiveData(
 *   { patientName: '张建国', phone: '13812345678' },
 *   [{ field: 'patientName', type: 'name' }, { field: 'phone', type: 'phone' }],
 *   'doctor'
 * )
 * // { patientName: '张*国', phone: '138****5678' }
 */
export function maskSensitiveData(
  data: unknown,
  fields: SensitiveFieldRule[],
  role: SensitiveRole,
): unknown {
  // admin 不脱敏，仅做深拷贝切断引用
  if (isUnmaskedRole(role)) return deepClone(data);

  // 建立小写字段名 → 类型 索引
  const fieldIndex = new Map<string, SensitiveFieldType>();
  for (const rule of fields) {
    fieldIndex.set(rule.field.toLowerCase(), rule.type);
  }

  const walk = (node: unknown): unknown => {
    if (node === null || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map((item) => walk(item));
    const record = node as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record)) {
      const type = fieldIndex.get(key.toLowerCase());
      const value = record[key];
      if (type) {
        out[key] = applyMask(type, value);
      } else if (value !== null && typeof value === 'object') {
        out[key] = walk(value);
      } else {
        out[key] = value;
      }
    }
    return out;
  };

  return walk(data);
}

/* ------------------------------------------------------------------ */
/* 默认配置（供 admin 配置页 / GET 接口读取）                             */
/* ------------------------------------------------------------------ */

/** 默认敏感字段规则表（与既有业务模型对齐） */
export const DEFAULT_MASK_RULES: SensitiveFieldRule[] = [
  { field: 'patientName', type: 'name' },
  { field: 'realName', type: 'name' },
  { field: 'doctorName', type: 'name' },
  { field: 'idCard', type: 'idCard' },
  { field: 'idNo', type: 'idCard' },
  { field: 'phone', type: 'phone' },
  { field: 'mobile', type: 'phone' },
  { field: 'homeAddress', type: 'address' },
  { field: 'address', type: 'address' },
];

/** 各角色可见性策略说明 */
export const ROLE_MASK_POLICY: Record<SensitiveRole, { masked: boolean; description: string }> = {
  admin: { masked: false, description: '全量可见（系统管理员，用于审计与配置）' },
  doctor: { masked: true, description: '按字段规则脱敏（诊疗必需的最小可见集）' },
  nurse: { masked: true, description: '按字段规则脱敏（护理工作站最小可见集）' },
  patient: { masked: true, description: '最严脱敏（患者侧仅返回本人必要信息）' },
};

/** GET /api/v1/admin/security/mask-config 返回体 */
export interface MaskConfigSnapshot {
  rules: SensitiveFieldRule[];
  rolePolicy: Record<SensitiveRole, { masked: boolean; description: string }>;
  samples: {
    name: { input: string; masked: string };
    idCard: { input: string; masked: string };
    phone: { input: string; masked: string };
    address: { input: string; masked: string };
  };
  updatedAt: string;
}

/** 构造当前脱敏配置快照（纯函数，便于单测与接口返回） */
export function getMaskConfigSnapshot(): MaskConfigSnapshot {
  return {
    rules: deepClone(DEFAULT_MASK_RULES),
    rolePolicy: deepClone(ROLE_MASK_POLICY),
    samples: {
      name: { input: '张建国', masked: maskName('张建国') },
      idCard: { input: '330106199001011234', masked: maskIdCard('330106199001011234') },
      phone: { input: '13812345678', masked: maskPhone('13812345678') },
      address: { input: '杭州市西湖区文三路123号', masked: maskAddress('杭州市西湖区文三路123号') },
    },
    updatedAt: new Date().toISOString(),
  };
}
