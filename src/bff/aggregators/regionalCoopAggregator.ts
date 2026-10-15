/**
 * 健澜科技 jlmedaios - 区域医疗协同聚合器（M143-D）【互联网医院与远程医疗】
 *
 * 业务目标：把区域内可协同的医院资源收敛成一张「区域医疗资源地图」，
 *   基层医院遇到超出本院能力的患者时，能在区域内快速找到最合适的上级医院
 *   完成双向转诊，避免患者自行奔波、重复检查、重复拍片。
 *
 * 三个纯函数围绕「医院注册 -> 资源匹配 -> 转诊建议」展开：
 *   - registerRegionalHospital(name, level, services, specialties, capacity, contact)：
 *       把一家协同医院登记进区域资源台账，自动从院名解析所在区域；
 *   - findBestReferralHospital(condition, location, level)：
 *       按病种关键词 / 所在区域 / 最低等级，给当前医院推荐最适合转诊承接的医院，
 *       按「专科命中 > 等级 > 就近 > 床位容量」打分排序；
 *   - buildRegionalResourceMap()：
 *       输出整张区域资源地图（按等级 / 协同能力 / 重点专科 / 区域聚合 + 总床位）。
 *
 * 四项协同能力：检验结果互认 / 影像资料共享 / 专家号源共享 / 双向转诊通道。
 *
 * 患者隐私：跨院共享的 patient_id 一律脱敏（maskPatientId），保留前 2 位 + **** +
 *   后 2 位，如 P01234523 -> P0****23；原始主索引（EMPI）不出院。
 *
 * 设计说明：
 *   本模块为无库依赖的纯函数内核（与 logisticsAggregator 同思路），状态收敛在模块级
 *   内存台账中，id 由确定性计数器生成（reg_0001 …），同一序列恒等输出，便于单测与
 *   重放；生产环境可在路由层把同名函数对接到 clinical.regional_medical_resource 表，
 *   函数内核口径保持不变。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 医院等级白名单 */
export type HospitalLevel = '三级甲等' | '三级乙等' | '二级甲等' | '二级乙等' | '一级';

/** 四项协同能力（互联网医院与远程医疗） */
export type RegionalService =
  | '检验结果互认'
  | '影像资料共享'
  | '专家号源共享'
  | '双向转诊通道';

/** 协同医院档案 */
export interface Hospital {
  id: string;
  name: string;
  level: HospitalLevel;
  /** 已开通的协同能力 */
  services: RegionalService[];
  /** 重点专科（用于按病种匹配转诊承接医院） */
  specialties: string[];
  /** 开放床位数 */
  capacity: number;
  /** 对外联络：对接人 + 电话 */
  contact: string;
  /** 所在区域（从院名解析） */
  region: string;
  createdAt: string;
}

/** 区域资源地图聚合视图 */
export interface ResourceMap {
  /** 已登记医院总数 */
  total: number;
  /** 区域内开放床位合计 */
  totalBeds: number;
  /** 按医院等级计数 */
  byLevel: Record<string, number>;
  /** 按协同能力计数（开通该项能力的医院数） */
  byService: Record<string, number>;
  /** 按重点专科计数 */
  bySpecialty: Record<string, number>;
  /** 按所在区域计数 */
  byRegion: Record<string, number>;
  /** 全量医院（新登记的排最前） */
  hospitals: Hospital[];
}

/** 四项协同能力白名单 */
export const REGIONAL_SERVICES: readonly RegionalService[] = [
  '检验结果互认', '影像资料共享', '专家号源共享', '双向转诊通道',
];

/** 医院等级白名单 */
export const HOSPITAL_LEVELS: readonly HospitalLevel[] = [
  '三级甲等', '三级乙等', '二级甲等', '二级乙等', '一级',
];

/** 等级数值越大能力越强，用于转诊时「向上找」 */
const LEVEL_RANK: Record<HospitalLevel, number> = {
  '三级甲等': 5, '三级乙等': 4, '二级甲等': 3, '二级乙等': 2, '一级': 1,
};

// ---- 区域关键词表：浙江地市 + 主要协作城市，命中即归区；未命中归「本地」 ---------
const REGION_KEYWORDS: readonly string[] = [
  '杭州', '宁波', '温州', '绍兴', '嘉兴', '湖州', '金华', '衢州',
  '舟山', '台州', '丽水', '上海', '北京', '南京', '苏州',
];

// ---- 病种关键词 -> 重点专科映射：基层医生填「胸痛/脑梗」也能匹配到承接专科 -------
const CONDITION_TO_SPECIALTY: ReadonlyArray<{ keywords: string[]; specialty: string }> = [
  { keywords: ['胸痛', '心梗', '心肌梗死', '冠心病', '高血压', '心衰', '心律失常'], specialty: '心血管内科' },
  { keywords: ['卒中', '脑梗', '脑出血', '偏瘫', '脑外伤'], specialty: '神经外科' },
  { keywords: ['癫痫', '帕金森', '头痛', '脑炎'], specialty: '神经内科' },
  { keywords: ['肿瘤', '癌', '化疗', '放疗', '乳腺', '肺结节'], specialty: '肿瘤科' },
  { keywords: ['儿童', '小儿', '新生儿', '发热伴皮疹', '喘息'], specialty: '儿科' },
  { keywords: ['分娩', '产科', '妇科', '产后', '胎儿'], specialty: '妇产科' },
  { keywords: ['骨折', '关节', '腰椎', '肩袖', '运动损伤'], specialty: '骨科' },
  { keywords: ['透析', '肾衰', '蛋白尿', '尿毒症'], specialty: '肾内科' },
  { keywords: ['肺炎', '哮喘', '慢阻肺', '咯血', '肺栓塞'], specialty: '呼吸与危重症医学科' },
  { keywords: ['糖尿病', '甲亢', '甲减', '甲状腺结节'], specialty: '内分泌科' },
];

// ---- 模块级内存台账（纯函数内核的状态载体，可被 resetRegionalStore 清空） --------
const hospitalStore: Hospital[] = [];
let hospSeq = 0;

/** 测试辅助：清空台账与计数器，保证用例之间互不污染（不对外暴露为业务 API） */
export function resetRegionalStore(): void {
  hospitalStore.length = 0;
  hospSeq = 0;
}

/**
 * 患者隐私：跨院共享 patient_id 脱敏。
 * 规则：保留前 2 位 + **** + 后 2 位；长度不足 4 位时整体打码为 ****。
 * 例：P01234523 -> P0****23；原始 EMPPI 不出院。
 */
export function maskPatientId(rawId: string): string {
  const s = (rawId ?? '').trim();
  if (s.length <= 4) return '****';
  return `${s.slice(0, 2)}****${s.slice(-2)}`;
}

/** 从院名解析所在区域（命中关键词表即返回，否则归「本地」） */
export function resolveRegion(name: string): string {
  const n = (name ?? '').trim();
  for (const kw of REGION_KEYWORDS) {
    if (n.includes(kw)) return kw;
  }
  return '本地';
}

function assertValidLevel(level: string): asserts level is HospitalLevel {
  if (!HOSPITAL_LEVELS.includes(level as HospitalLevel)) {
    throw new Error(`医院等级非法：${level}（应为 ${HOSPITAL_LEVELS.join(' / ')} 之一）`);
  }
}

function normalizeServices(services: string[]): RegionalService[] {
  const out: RegionalService[] = [];
  for (const s of services ?? []) {
    const v = (s ?? '').trim();
    if (!v) continue;
    if (!REGIONAL_SERVICES.includes(v as RegionalService)) {
      throw new Error(`协同能力非法：${v}（应为 ${REGIONAL_SERVICES.join(' / ')} 之一）`);
    }
    if (!out.includes(v as RegionalService)) out.push(v as RegionalService);
  }
  if (out.length === 0) throw new Error('至少须登记一项协同能力（检验互认/影像共享/号源共享/双向转诊）');
  return out;
}

/**
 * 登记一家区域协同医院（纯函数）。
 * @param name        医院全称
 * @param level       医院等级（三级甲等/三级乙等/二级甲等/二级乙等/一级）
 * @param services    已开通的协同能力（四项中至少一项）
 * @param specialties 重点专科清单
 * @param capacity    开放床位数（>= 0）
 * @param contact     对外联络（对接人 + 电话）
 */
export function registerRegionalHospital(
  name: string,
  level: string,
  services: string[],
  specialties: string[],
  capacity: number,
  contact: string,
): Hospital {
  const n = (name ?? '').trim();
  if (!n) throw new Error('医院名称不能为空');
  assertValidLevel(level);
  const svcs = normalizeServices(services);
  const specs = (specialties ?? [])
    .map((s) => (s ?? '').trim())
    .filter(Boolean);
  if (specs.length === 0) throw new Error('至少须登记一个重点专科');
  const cap = Number(capacity);
  if (!Number.isFinite(cap) || cap < 0) throw new Error(`开放床位数非法：${capacity}（应为非负整数）`);
  const ct = (contact ?? '').trim();
  if (!ct) throw new Error('对外联络方式不能为空');

  // 同名医院幂等：已登记则直接返回原档，不重复造 id
  const existed = hospitalStore.find((h) => h.name === n);
  if (existed) return { ...existed };

  hospSeq += 1;
  const hosp: Hospital = {
    id: `reg_${String(hospSeq).padStart(4, '0')}`,
    name: n,
    level,
    services: svcs,
    specialties: specs,
    capacity: Math.floor(cap),
    contact: ct,
    region: resolveRegion(n),
    createdAt: new Date().toISOString(),
  };
  hospitalStore.push(hosp);
  return { ...hosp };
}

/** 病种关键词 -> 承接专科；未命中返回 null */
export function matchSpecialty(condition: string): string | null {
  const c = (condition ?? '').trim();
  if (!c) return null;
  for (const row of CONDITION_TO_SPECIALTY) {
    if (row.keywords.some((kw) => c.includes(kw))) return row.specialty;
  }
  return null;
}

/**
 * 转诊建议：按病种 / 所在区域 / 最低等级，推荐最合适的承接医院（纯函数）。
 *
 * 打分口径（高分在前）：
 *   1) 专科命中：病种关键词落到本院重点专科 +100；
 *   2) 开通「双向转诊通道」+30；
 *   3) 等级达标线以上每高一级 +10；
 *   4) 同区域就近 +20；
 *   5) 床位数多者 +capacity/1000（千分之一床位权重，避免大医院碾压一切）。
 *
 * @param condition 病种描述，如「急性胸痛 2 小时」
 * @param location  转诊发起方所在区域，如「杭州」；空串 = 不限制区域
 * @param level     最低可接等级，如「二级甲等」；空串 = 不限制等级
 */
export function findBestReferralHospital(
  condition: string,
  location: string,
  level: string,
): Hospital[] {
  const wantedSpecialty = matchSpecialty(condition);
  const minRank = level ? LEVEL_RANK[level as HospitalLevel] ?? 0 : 0;
  const loc = (location ?? '').trim();

  const scored = hospitalStore
    .filter((h) => {
      // 等级过滤：低于要求的不接
      if (minRank && LEVEL_RANK[h.level] < minRank) return false;
      // 区域过滤：要求了区域就只看同区域；未要求则全量
      if (loc && h.region !== loc) return false;
      return true;
    })
    .map((h) => {
      let score = 0;
      if (wantedSpecialty && h.specialties.includes(wantedSpecialty)) score += 100;
      if (h.services.includes('双向转诊通道')) score += 30;
      if (minRank) score += (LEVEL_RANK[h.level] - minRank) * 10;
      if (loc && h.region === loc) score += 20;
      score += h.capacity / 1000;
      return { h, score };
    })
    // 只保留：要么专科命中，要么开通了双向转诊通道（否则没有转诊意义）
    .filter(({ h }) =>
      wantedSpecialty ? h.specialties.includes(wantedSpecialty) || h.services.includes('双向转诊通道') : true,
    )
    .sort((a, b) => b.score - a.score || b.h.capacity - a.h.capacity || a.h.id.localeCompare(b.h.id));

  return scored.map(({ h }) => ({ ...h }));
}

/**
 * 构建整张区域医疗资源地图（纯函数）。
 * 供管理端「区域医疗资源地图页」一次性拉取：按等级 / 协同能力 / 专科 / 区域四维聚合。
 */
export function buildRegionalResourceMap(): ResourceMap {
  const byLevel: Record<string, number> = {};
  const byService: Record<string, number> = {};
  const bySpecialty: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  let totalBeds = 0;

  for (const h of hospitalStore) {
    byLevel[h.level] = (byLevel[h.level] ?? 0) + 1;
    for (const s of h.services) byService[s] = (byService[s] ?? 0) + 1;
    for (const sp of h.specialties) bySpecialty[sp] = (bySpecialty[sp] ?? 0) + 1;
    byRegion[h.region] = (byRegion[h.region] ?? 0) + 1;
    totalBeds += h.capacity;
  }

  return {
    total: hospitalStore.length,
    totalBeds,
    byLevel,
    byService,
    bySpecialty,
    byRegion,
    // 新登记的排最前
    hospitals: [...hospitalStore].reverse().map((h) => ({ ...h })),
  };
}

/** 只读视图：全部已登记医院（新登记的排最前） */
export function listRegionalHospitals(): Hospital[] {
  return [...hospitalStore].reverse().map((h) => ({ ...h }));
}
