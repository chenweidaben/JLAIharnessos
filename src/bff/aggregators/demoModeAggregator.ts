/**
 * 健澜科技数智医院智能体（jlmedaios）- BFF 演示模式聚合器（M125-C）
 *
 * 【演示就绪】
 *  - 本模块为纯函数集合，无 IO、无副作用、无全局可变状态，可单测、可并行、可回放；
 *  - 演示模式（DEMO_MODE=1）下，所有对外输出的患者/医生数据与基础设施配置统一脱敏，
 *    确保现场演示、客户汇报、招投标 POC 不会泄露真实患者 PII 与内网/密钥信息；
 *  - 不修改入参，所有输出均为深拷贝副本，避免污染上游缓存与审计快照。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型定义                                                             */
/* ------------------------------------------------------------------ */

/** 前端演示视图配置（提示条文案 / 水印文案 / 是否可见） */
export interface DemoViewConfig {
  /** 是否显示提示条与全屏水印 */
  visible: boolean;
  /** 右上角提示条文案 */
  bannerText: string;
  /** 全屏斜向水印文案 */
  watermarkText: string;
}

/* ------------------------------------------------------------------ */
/* 模式判断纯函数                                                        */
/* ------------------------------------------------------------------ */

/**
 * 判断当前是否处于演示模式。
 *
 * 【演示就绪】兼容三种入参形态：
 *  - true / false（裸布尔，便于单测与显式传参）；
 *  - { demoMode: true }（与 EnvConfig 对齐，生产路由直接传入 getEnv()）；
 *  - null / undefined / 其它任意对象 → 一律视为非演示模式（fail-safe）。
 *
 * @example
 * isDemoMode({ demoMode: true })  // true
 * isDemoMode({ demoMode: false }) // false
 * isDemoMode(true)                // true
 * isDemoMode(null)                // false
 */
export function isDemoMode(env: unknown): boolean {
  if (typeof env === 'boolean') return env;
  if (env !== null && typeof env === 'object' && 'demoMode' in env) {
    return Boolean((env as { demoMode?: unknown }).demoMode);
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* 演示数据脱敏纯函数                                                    */
/* ------------------------------------------------------------------ */

/** 患者标签轮换字母池（超出后回退到数字编号） */
const PATIENT_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** 敏感基础设施 / 配置字段名（小写匹配），演示模式下一律隐藏 */
const SENSITIVE_KEYS = new Set<string>([
  'ip',
  'clientip',
  'ipaddress',
  'remoteip',
  'xforwardedfor',
  'host',
  'hostname',
  'endpoint',
  'baseurl',
  'apiendpoint',
  'apikey',
  'apisecret',
  'apitoken',
  'secret',
  'password',
  'passwd',
  'token',
  'accesstoken',
  'refreshtoken',
  'databaseurl',
  'connectionstring',
  'connstring',
  'dsn',
]);

/** 被隐藏字段的统一占位文案 */
const HIDDEN_PLACEHOLDER = '***（演示模式已隐藏）';

/** 患者姓名字段：key 同时含 patient 与 name（如 patientName / patient_name） */
function isPatientNameKey(lowerKey: string): boolean {
  return lowerKey.includes('patient') && lowerKey.includes('name');
}

/** 医生姓名字段：key 同时含 doctor 与 name（如 doctorName / attendingDoctorName） */
function isDoctorNameKey(lowerKey: string): boolean {
  return lowerKey.includes('doctor') && lowerKey.includes('name');
}

/** 敏感基础设施 / 配置字段 */
function isSensitiveKey(lowerKey: string): boolean {
  return SENSITIVE_KEYS.has(lowerKey);
}

/** 患者标签：按出现顺序轮换 A-F，超出后回退为数字编号，保证同一演示数据确定性 */
function patientLabel(index: number): string {
  if (index < PATIENT_LETTERS.length) {
    return `演示患者${PATIENT_LETTERS[index]}`;
  }
  return `演示患者${index + 1}`;
}

/**
 * 演示模式整包数据脱敏。
 *
 * 【演示就绪】规则（递归遍历，输出深拷贝，不改入参）：
 *  - 患者姓名（patientName 类字段）→ 轮换为「演示患者A / 演示患者B / 演示患者C …」；
 *  - 医生姓名（doctorName 类字段）→ 「演示医生-<科室名>」，科室取自同层 dept / department，
 *    缺省回退「内科」；
 *  - 真实 IP / Host / Endpoint / API Key / 数据库连接串等敏感配置字段 → 统一替换为占位文案；
 *  - 其余字段原样保留，保证演示界面功能链路完整。
 *
 * @example
 * maskForDemo({ patientName: '张建国', doctorName: '李医生', dept: '心内科', ip: '10.0.0.5' })
 * // { patientName: '演示患者A', doctorName: '演示医生-心内科', dept: '心内科', ip: '***（演示模式已隐藏）' }
 */
export function maskForDemo(data: unknown): unknown {
  let patientCounter = 0;
  let doctorCounter = 0;

  const walk = (node: unknown, deptHint?: string): unknown => {
    if (node === null || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map((item) => walk(item, deptHint));

    const record = node as Record<string, unknown>;

    // 先在本层探测科室名，供医生姓名字段命名使用
    let currentDept = deptHint;
    for (const key of Object.keys(record)) {
      const lower = key.toLowerCase();
      const value = record[key];
      if (
        (lower === 'dept' || lower === 'department' || lower === 'deptname' || lower === 'departmentname') &&
        typeof value === 'string' &&
        value.length > 0
      ) {
        currentDept = value;
        break;
      }
    }

    const out: Record<string, unknown> = {};
    for (const key of Object.keys(record)) {
      const value = record[key];
      const lower = key.toLowerCase();

      // 1) 患者姓名 → 演示患者A/B/C
      if (isPatientNameKey(lower) && typeof value === 'string') {
        out[key] = patientLabel(patientCounter++);
        continue;
      }

      // 2) 医生姓名 → 演示医生-科室名
      if (isDoctorNameKey(lower) && typeof value === 'string') {
        out[key] = `演示医生-${currentDept ?? '内科'}`;
        doctorCounter++;
        continue;
      }

      // 3) 敏感 IP / 配置字段 → 统一隐藏
      if (isSensitiveKey(lower)) {
        out[key] = HIDDEN_PLACEHOLDER;
        continue;
      }

      // 4) 其余字段：递归对象 / 数组，标量原样保留
      if (value !== null && typeof value === 'object') {
        out[key] = walk(value, currentDept);
      } else {
        out[key] = value;
      }
    }
    return out;
  };

  return walk(data);
}

/* ------------------------------------------------------------------ */
/* 演示视图配置（供前端提示条 / 水印使用）                                */
/* ------------------------------------------------------------------ */

/**
 * 根据演示模式开关生成前端视图配置。
 *
 * 【演示就绪】生产模式下全部隐藏、文案置空，确保不干扰正式环境界面。
 */
export function getDemoViewConfig(demoMode: boolean): DemoViewConfig {
  if (!demoMode) {
    return { visible: false, bannerText: '', watermarkText: '' };
  }
  return {
    visible: true,
    bannerText: '演示模式 · 数据已脱敏',
    watermarkText: '演示模式 · 杭州健澜科技有限公司',
  };
}
