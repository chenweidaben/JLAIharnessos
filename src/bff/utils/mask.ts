/**
 * 健澜科技数智医院智能体 - BFF 隐私数据脱敏工具
 *
 * 用于审计日志、对外接口返回、错误上报等场景，避免明文落库/打印
 * 患者与员工的姓名、证件号、手机号等个人敏感信息（PII）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 脱敏姓名：保留姓氏首字，其余以单个 * 代替。
 *
 * 规则：
 *  - 空值/非字符串原样返回空串；
 *  - 单字姓名直接返回该字（无可掩码部分）；
 *  - 多字姓名取首字 + '*'，例如「张三」→「张*」、「欧阳」→「欧*」。
 *
 * @param name 原始姓名
 * @returns 脱敏后的姓名
 *
 * @example
 * maskName('张三丰') // '张*'
 * maskName('欧阳娜娜') // '欧*'
 */
export function maskName(name: string | null | undefined): string {
  if (typeof name !== 'string') return '';
  const trimmed = name.trim();
  if (trimmed.length <= 1) return trimmed;
  return `${trimmed[0]}*`;
}

/**
 * 脱敏身份证号：保留前 3 位与后 4 位，中间 8 位以 * 代替。
 *
 * 18 位居民身份证号示例：「330106199001011234」→「330********1234」。
 * 对长度不足的输入做兜底：从两侧向中间掩码，中间统一以 8 个 * 输出，
 * 不破坏固定输出宽度，便于日志检索。
 *
 * @param id 原始身份证号
 * @returns 脱敏后的身份证号
 *
 * @example
 * maskIdCard('330106199001011234') // '330********1234'
 */
export function maskIdCard(id: string | null | undefined): string {
  if (typeof id !== 'string') return '';
  const value = id.trim();
  if (value.length === 0) return '';
  if (value.length <= 7) return '*'.repeat(Math.min(8, value.length));
  const head = value.slice(0, 3);
  const tail = value.slice(-4);
  return `${head}********${tail}`;
}

/**
 * 脱敏手机号：保留前 3 位与后 4 位，中间 4 位以 * 代替。
 *
 * 11 位中国大陆手机号示例：「13812345678」→「138****5678」。
 *
 * @param phone 原始手机号
 * @returns 脱敏后的手机号
 *
 * @example
 * maskPhone('13812345678') // '138****5678'
 */
export function maskPhone(phone: string | null | undefined): string {
  if (typeof phone !== 'string') return '';
  const value = phone.trim();
  if (value.length === 0) return '';
  if (value.length <= 7) return '*'.repeat(Math.min(4, value.length));
  const head = value.slice(0, 3);
  const tail = value.slice(-4);
  return `${head}****${tail}`;
}

/** 姓名字段名（小写匹配） */
const NAME_FIELDS = new Set([
  'name',
  'realname',
  'patientname',
  'username',
  'doctorname',
  'appointmentname',
]);
/** 证件号字段名（小写匹配） */
const IDCARD_FIELDS = new Set(['idcard', 'idno', 'certno', 'identitycard']);
/** 手机号字段名（小写匹配） */
const PHONE_FIELDS = new Set(['phone', 'mobile', 'telephone', 'phonenumber']);

/**
 * 递归遍历对象，对命中敏感字段名的值做脱敏（供审计日志 body 使用）。
 *
 * 识别规则（大小写不敏感的字段名匹配）：
 *  - name / realName / patientName / userName / doctorName → maskName
 *  - idCard / idNo / certNo / identityCard → maskIdCard
 *  - phone / mobile / telephone / phoneNumber → maskPhone
 *
 * 其余字段原样保留；非对象值原样返回。
 *
 * @param body 原始请求体（任意 JSON 可序列化结构）
 * @returns 脱敏后的副本（不修改入参）
 */
export function maskBody<T>(body: T): T {
  if (body === null || body === undefined || typeof body !== 'object') {
    return body;
  }
  if (Array.isArray(body)) {
    return body.map((item) => maskBody(item)) as T;
  }
  const record = body as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(record)) {
    const lower = key.toLowerCase();
    const value = record[key];
    if (NAME_FIELDS.has(lower)) {
      out[key] = maskName(typeof value === 'string' ? value : '');
    } else if (IDCARD_FIELDS.has(lower)) {
      out[key] = maskIdCard(typeof value === 'string' ? value : '');
    } else if (PHONE_FIELDS.has(lower)) {
      out[key] = maskPhone(typeof value === 'string' ? value : '');
    } else {
      out[key] = maskBody(value);
    }
  }
  return out as T;
}
