/**
 * 健澜科技 jlmedaios - 区域医疗协同聚合器（M159-B）【集团化扩展·区域医疗协同】
 *
 * 业务目标：在医疗集团 / 医联体范围内，把跨院协同的四类动作收敛成纯函数内核——
 *   ① 跨院转诊（上转 / 下转 / 双向）：按病种命中专科 + 医院等级差决定转诊方向；
 *   ② 检验检查结果互认：跨院结果是否可被目标科室直接采信（互认名录 + 时效 + 质量）；
 *   ③ 号源共享：专家号跨院预约，转诊时自动分配一个可共享专家号；
 *   ④ 资源调配：跨院设备 / 专家支援，按集团内医院归属校验后留痕。
 *
 * 【中期路线图】本切片为无库依赖的纯函数内核（与 regionalCoopAggregator 同思路），
 *   状态收敛在模块级内存台账中，id 由确定性计数器生成，同一序列恒等输出，便于单测与重放；
 *   生产环境可在路由层把同名函数对接到 clinical.regional_collab_* 系列表，函数内核口径保持不变。
 *
 * 【数据隔离·红线】所有数据按 hospital_id 严格隔离，绝不串院：
 *   - buildRegionalCollaboration(groupId) 只返回属于该 groupId 的医院，
 *     他院（同集团外 / 异集团）的医院、号源、设备、调配单一概不泄漏；
 *   - matchReferral 不允许「本院转本院」（sourceHospitalId === targetHospitalId 直接拒收），
 *     且匹配结果只引用入参给定的目标医院，不隐式拉取他院数据；
 *   - verifyCrossHospitalResult 输出始终回带 sourceHospitalId，目标院采信的是「别院出的结果」，
 *     不会把 A 院结果错记到 B 院患者头上；
 *   - 跨院共享的 patient_id 一律脱敏（maskPatientId），原始主索引不出院。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 医院等级（集团内分级） */
export type HospitalLevel = '三级' | '二级' | '一级';

/** 转诊方向：上转（下级→上级）/ 下转（上级→下级康复）/ 双向（同级互转） */
export type ReferralDirection = '上转' | '下转' | '双向';

/** 资源调配类型 */
export type ResourceType = '专家支援' | '设备支援';

/** 集团内协同医院档案 */
export interface GroupHospital {
  /** 医院唯一标识（隔离键） */
  hospitalId: string;
  /** 所属集团 / 医联体 id（隔离键） */
  groupId: string;
  name: string;
  level: HospitalLevel;
  region: string;
  /** 重点专科（病种命中用） */
  specialties: string[];
  /** 可对外共享的专家号源数 */
  expertSlots: number;
  /** 可对外支援的设备清单（如 64 排 CT / 1.5T MR / 平板 DSA） */
  availableDevices: string[];
  /** 开放床位 */
  capacity: number;
}

/** 转诊发起患者（sourceHospitalId 为隔离键） */
export interface ReferralPatient {
  patientId: string;
  /** 来源医院 id（隔离键） */
  hospitalId: string;
  /** 来源医院等级（用于判定上转/下转） */
  sourceLevel: HospitalLevel;
  name: string;
  age: number;
  gender: '男' | '女';
  condition: string;
  /** 病情危重程度 1-5（越大越重） */
  severity: number;
}

/** 转诊匹配结果 */
export interface ReferralMatch {
  sourceHospitalId: string;
  targetHospitalId: string;
  direction: ReferralDirection;
  matchedSpecialty: string;
  score: number;
  reason: string;
  /** 是否可承接（false = 拒收，方向/等级/号源不满足） */
  accepted: boolean;
  /** 跨院预约到的专家号（号源共享；0 = 无可共享号源） */
  sharedExpertSlot: number;
  /** 脱敏后的患者号（出网不外泄原始 EMPI） */
  maskedPatientId: string;
}

/** 跨院检查 / 检验结果 */
export interface CrossHospitalExamResult {
  resultId: string;
  /** 出检医院 id（隔离键） */
  sourceHospitalId: string;
  patientId: string;
  /** 项目类型：检验 / 影像 / 病理 / 超声 */
  examType: '检验' | '影像' | '病理' | '超声';
  /** 出检日期 ISO 串（YYYY-MM-DD） */
  examDate: string;
  /** 出检医院是否在区域检验检查互认名录内 */
  accredited: boolean;
  /** 结果质量 */
  qualityFlag: '合格' | '存疑';
}

/** 互认校验结果 */
export interface RecognitionResult {
  resultId: string;
  sourceHospitalId: string;
  targetHospitalId: string;
  targetDept: string;
  /** 是否采信（互认） */
  recognized: boolean;
  reason: string;
  /** 互认有效期剩余天数（<0 表示已过期） */
  validDaysLeft: number;
  /** 是否需要重查 */
  needReexam: boolean;
}

/** 资源调配留痕 */
export interface ResourceDispatch {
  dispatchId: string;
  resourceType: ResourceType;
  resourceName: string;
  fromHospitalId: string;
  toHospitalId: string;
  groupId: string;
  reason: string;
  createdAt: string;
}

/** 区域协同地图聚合视图 */
export interface RegionalMap {
  groupId: string;
  /** 本集团内医院总数（严格隔离：他集团医院不出现） */
  hospitals: GroupHospital[];
  total: number;
  totalBeds: number;
  byLevel: Record<string, number>;
  byRegion: Record<string, number>;
  /** 集团内可共享专家号源合计 */
  totalExpertSlots: number;
  /** 集团内可支援设备条目合计（去重前条目数） */
  totalDevices: number;
  /** 本集团内的资源调配单 */
  dispatches: ResourceDispatch[];
  generatedAt: string;
}

/** 等级数值越大能力越强 */
const LEVEL_RANK: Record<HospitalLevel, number> = {
  '三级': 3,
  '二级': 2,
  '一级': 1,
};

/** 病种关键词 -> 承接专科（基层医生填「胸痛/脑梗」也能命中） */
const CONDITION_TO_SPECIALTY: ReadonlyArray<{ keywords: string[]; specialty: string }> = [
  { keywords: ['胸痛', '心梗', '冠心病', '心衰', '心律失常'], specialty: '心血管内科' },
  { keywords: ['卒中', '脑梗', '脑出血', '偏瘫', '脑外伤'], specialty: '神经外科' },
  { keywords: ['癫痫', '帕金森', '头痛', '脑炎'], specialty: '神经内科' },
  { keywords: ['肿瘤', '癌', '化疗', '放疗', '乳腺', '肺结节'], specialty: '肿瘤科' },
  { keywords: ['儿童', '小儿', '新生儿', '喘息'], specialty: '儿科' },
  { keywords: ['分娩', '产科', '妇科', '产后'], specialty: '妇产科' },
  { keywords: ['骨折', '关节', '腰椎', '运动损伤'], specialty: '骨科' },
  { keywords: ['透析', '肾衰', '蛋白尿', '尿毒症'], specialty: '肾内科' },
  { keywords: ['肺炎', '哮喘', '慢阻肺', '咯血'], specialty: '呼吸与危重症医学科' },
  { keywords: ['糖尿病', '甲亢', '甲减', '甲状腺'], specialty: '内分泌科' },
];

/** 各项目类型的互认有效期（天） */
const RECOGNITION_VALID_DAYS: Readonly<Record<CrossHospitalExamResult['examType'], number>> = {
  '检验': 30,
  '超声': 60,
  '影像': 90,
  '病理': 365,
};

// ---- 模块级内存台账（纯函数内核的状态载体，可被 resetRegionalCollabStore 清空） ------
const groupHospitalStore: GroupHospital[] = [];
const dispatchStore: ResourceDispatch[] = [];
let dispatchSeq = 0;

/** 测试辅助：清空台账与计数器，保证用例之间互不污染（不对外暴露为业务 API） */
export function resetRegionalCollabStore(): void {
  groupHospitalStore.length = 0;
  dispatchStore.length = 0;
  dispatchSeq = 0;
}

/**
 * 患者隐私：跨院共享 patient_id 脱敏。
 * 规则：保留前 2 位 + **** + 后 2 位；长度不足 4 位时整体打码为 ****。
 * 例：P01234523 -> P0****23；原始 EMPI 不出院。
 */
export function maskPatientId(rawId: string): string {
  const s = (rawId ?? '').trim();
  if (s.length <= 4) return '****';
  return `${s.slice(0, 2)}****${s.slice(-2)}`;
}

function assertValidLevel(level: string): asserts level is HospitalLevel {
  if (level !== '三级' && level !== '二级' && level !== '一级') {
    throw new Error(`医院等级非法：${level}（应为 三级 / 二级 / 一级 之一）`);
  }
}

/**
 * 登记一家集团内协同医院（测试 / 种子用，纯函数）。
 * 同名（同 hospitalId）幂等返回原档。
 */
export function registerGroupHospital(input: {
  hospitalId: string;
  groupId: string;
  name: string;
  level: string;
  region: string;
  specialties: string[];
  expertSlots?: number;
  availableDevices?: string[];
  capacity?: number;
}): GroupHospital {
  const hospitalId = (input.hospitalId ?? '').trim();
  const groupId = (input.groupId ?? '').trim();
  if (!hospitalId) throw new Error('hospitalId 不能为空（数据隔离键）');
  if (!groupId) throw new Error('groupId 不能为空（集团隔离键）');
  assertValidLevel(input.level);
  const name = (input.name ?? '').trim();
  if (!name) throw new Error('医院名称不能为空');

  // 同 hospitalId 幂等：已登记直接返回原档，避免重复造号源 / 设备计数
  const existed = groupHospitalStore.find((h) => h.hospitalId === hospitalId);
  if (existed) return { ...existed };

  const hosp: GroupHospital = {
    hospitalId,
    groupId,
    name,
    level: input.level as HospitalLevel,
    region: (input.region ?? '').trim() || '本地',
    specialties: (input.specialties ?? []).map((s) => (s ?? '').trim()).filter(Boolean),
    expertSlots: Math.max(0, Math.floor(Number(input.expertSlots ?? 0))),
    availableDevices: (input.availableDevices ?? []).map((d) => (d ?? '').trim()).filter(Boolean),
    capacity: Math.max(0, Math.floor(Number(input.capacity ?? 0))),
  };
  groupHospitalStore.push(hosp);
  return { ...hosp };
}

/** 按 hospitalId 在台账中查医院（仅限本模块内部，不外泄整院档案给路由层） */
function findHospital(hospitalId: string): GroupHospital | undefined {
  return groupHospitalStore.find((h) => h.hospitalId === hospitalId);
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
 * 构建集团区域协同地图（纯函数）。
 *
 * 【数据隔离】只聚合 groupId 命中的医院；他集团 / 异集团医院的床位、号源、设备、
 *   调配单一律不进入视图——这是「不串院」在地图层的硬保证。
 *
 * @param groupId 集团 / 医联体 id（隔离键）
 */
export function buildRegionalCollaboration(groupId: string): RegionalMap {
  const gid = (groupId ?? '').trim();
  if (!gid) throw new Error('groupId 不能为空（集团隔离键）');

  // 严格隔离：只取本集团医院
  const hospitals = groupHospitalStore.filter((h) => h.groupId === gid);

  const byLevel: Record<string, number> = {};
  const byRegion: Record<string, number> = {};
  let totalBeds = 0;
  let totalExpertSlots = 0;
  let totalDevices = 0;
  for (const h of hospitals) {
    byLevel[h.level] = (byLevel[h.level] ?? 0) + 1;
    byRegion[h.region] = (byRegion[h.region] ?? 0) + 1;
    totalBeds += h.capacity;
    totalExpertSlots += h.expertSlots;
    totalDevices += h.availableDevices.length;
  }

  // 调配单隔离：只保留两端医院均属本集团的调配单
  const groupHospitalIds = new Set(hospitals.map((h) => h.hospitalId));
  const dispatches = dispatchStore.filter(
    (d) => d.groupId === gid && groupHospitalIds.has(d.fromHospitalId) && groupHospitalIds.has(d.toHospitalId),
  );

  return {
    groupId: gid,
    hospitals: hospitals.map((h) => ({ ...h })),
    total: hospitals.length,
    totalBeds,
    byLevel,
    byRegion,
    totalExpertSlots,
    totalDevices,
    dispatches: dispatches.map((d) => ({ ...d })),
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 跨院转诊匹配（纯函数）：决定上转 / 下转 / 双向，并给出是否可承接与专家号。
 *
 * 方向判定（按等级差）：
 *   - 目标院等级 > 来源院 → 上转（基层把重症送上去）
 *   - 目标院等级 < 来源院 → 下转（术后 / 康复转下来）
 *   - 同级            → 双向（同级专科互转）
 *
 * 【数据隔离红线】
 *   - sourcePatient.hospitalId === targetHospital.hospitalId → 拒收（不允许本院转本院，
 *     那不是跨院转诊，串院操作直接拦在匹配层）；
 *   - 匹配只依据入参 targetHospital，不隐式查询 / 返回他院档案。
 *
 * @param sourcePatient  发起患者（带来源院 hospitalId + sourceLevel）
 * @param targetHospital 目标承接医院（带 hospitalId + level）
 * @param condition      病种描述，如「急性胸痛 2 小时」
 */
export function matchReferral(
  sourcePatient: ReferralPatient,
  targetHospital: Pick<GroupHospital, 'hospitalId' | 'name' | 'level' | 'specialties' | 'expertSlots'>,
  condition: string,
): ReferralMatch {
  const srcId = (sourcePatient?.hospitalId ?? '').trim();
  const tgtId = (targetHospital?.hospitalId ?? '').trim();
  if (!srcId) throw new Error('sourcePatient.hospitalId 不能为空（来源院隔离键）');
  if (!tgtId) throw new Error('targetHospital.hospitalId 不能为空（目标院隔离键）');

  // 红线：本院转本院 = 串院，直接拒收
  if (srcId === tgtId) {
    return {
      sourceHospitalId: srcId,
      targetHospitalId: tgtId,
      direction: '双向',
      matchedSpecialty: matchSpecialty(condition) ?? '全科',
      score: 0,
      reason: '本院转本院不构成跨院转诊，已按数据隔离红线拒收',
      accepted: false,
      sharedExpertSlot: 0,
      maskedPatientId: maskPatientId(sourcePatient.patientId),
    };
  }

  const srcRank = LEVEL_RANK[sourcePatient.sourceLevel] ?? 0;
  const tgtRank = LEVEL_RANK[targetHospital.level] ?? 0;
  const direction: ReferralDirection =
    tgtRank > srcRank ? '上转' : tgtRank < srcRank ? '下转' : '双向';

  const specialty = matchSpecialty(condition);
  const specialtyHit = specialty != null && targetHospital.specialties.includes(specialty);

  // 打分：专科命中 +100；方向合理（上转应去更高等级）+30；可共享号源 + expertSlots/10
  let score = 0;
  if (specialtyHit) score += 100;
  if (direction === '上转' && tgtRank > srcRank) score += 30;
  if (direction === '下转' && tgtRank < srcRank) score += 20;
  score += targetHospital.expertSlots / 10;

  // 可承接：
  //   - 上转 / 双向：要么专科命中，要么目标院有共享专家号（号源共享通道）；
  //   - 下转：术后 / 康复期转回基层，基层具备基本康复能力即可承接，不苛求专科命中。
  const hasSlot = targetHospital.expertSlots > 0;
  const accepted = specialtyHit || hasSlot || direction === '下转';

  // 号源共享：上转 / 双向优先占专家号；下转康复一般不需要专家号
  const sharedExpertSlot = accepted && (direction === '上转' || direction === '双向') && hasSlot
    ? Math.min(targetHospital.expertSlots, 1)
    : 0;

  const reason = !accepted
    ? `目标院未命中「${specialty ?? '相关专科'}」且无可共享专家号源，暂不承接`
    : specialtyHit
      ? `目标院「${targetHospital.name}」命中${specialty}，可${direction}`
      : `目标院「${targetHospital.name}」开通专家号源共享，可${direction}`;

  return {
    sourceHospitalId: srcId,
    targetHospitalId: tgtId,
    direction,
    matchedSpecialty: specialty ?? '全科',
    score: Math.round(score * 100) / 100,
    reason,
    accepted,
    sharedExpertSlot,
    maskedPatientId: maskPatientId(sourcePatient.patientId),
  };
}

/**
 * 跨院检验检查结果互认校验（纯函数）。
 *
 * 采信（recognized）需同时满足三条：
 *   ① 出检医院在区域互认名录内（accredited = true）；
 *   ② 结果仍在有效期内（按 examType 的互认窗口，见 RECOGNITION_VALID_DAYS）；
 *   ③ 结果质量合格（qualityFlag = 合格）。
 * 任一不满足 → needReexam = true，建议重查。
 *
 * 【数据隔离】输出回带 sourceHospitalId，明确这份结果出自哪一家医院，
 *   目标院（targetHospitalId）只是采信方，不会把别院结果张冠李戴。
 *
 * @param examResult    跨院结果（带 sourceHospitalId）
 * @param targetDept    目标科室（如 心血管内科）
 * @param todayIso      参考日期（默认今天），便于单测固定时间窗口
 */
export function verifyCrossHospitalResult(
  examResult: CrossHospitalExamResult,
  targetDept: string,
  todayIso?: string,
): RecognitionResult {
  const srcId = (examResult?.sourceHospitalId ?? '').trim();
  if (!srcId) throw new Error('examResult.sourceHospitalId 不能为空（出检院隔离键）');
  const targetHospital = findHospital(srcId); // 仅用于回带，不外泄档案
  const targetHospitalId = targetHospital?.hospitalId ?? srcId;

  const today = new Date((todayIso ?? new Date().toISOString()).slice(0, 10));
  const examDay = new Date((examResult.examDate ?? '').slice(0, 10));
  if (Number.isNaN(examDay.getTime())) {
    return {
      resultId: examResult.resultId,
      sourceHospitalId: srcId,
      targetHospitalId,
      targetDept: (targetDept ?? '').trim() || '全科',
      recognized: false,
      reason: `出检日期非法：${examResult.examDate}，需重查`,
      validDaysLeft: 0,
      needReexam: true,
    };
  }

  const windowDays = RECOGNITION_VALID_DAYS[examResult.examType] ?? 60;
  const elapsed = Math.floor((today.getTime() - examDay.getTime()) / 86400000);
  const validDaysLeft = windowDays - elapsed;

  const targetDeptName = (targetDept ?? '').trim() || '全科';

  if (!examResult.accredited) {
    return {
      resultId: examResult.resultId,
      sourceHospitalId: srcId,
      targetHospitalId,
      targetDept: targetDeptName,
      recognized: false,
      reason: `出检医院（${srcId}）未纳入区域检验检查互认名录，${targetDeptName}不予互认`,
      validDaysLeft,
      needReexam: true,
    };
  }
  if (validDaysLeft <= 0) {
    return {
      resultId: examResult.resultId,
      sourceHospitalId: srcId,
      targetHospitalId,
      targetDept: targetDeptName,
      recognized: false,
      reason: `${examResult.examType}结果已超出 ${windowDays} 天互认有效期（已过 ${elapsed} 天），需复查`,
      validDaysLeft,
      needReexam: true,
    };
  }
  if (examResult.qualityFlag !== '合格') {
    return {
      resultId: examResult.resultId,
      sourceHospitalId: srcId,
      targetHospitalId,
      targetDept: targetDeptName,
      recognized: false,
      reason: `结果质量标记为「存疑」，${targetDeptName}需复核后再采信`,
      validDaysLeft,
      needReexam: true,
    };
  }

  return {
    resultId: examResult.resultId,
    sourceHospitalId: srcId,
    targetHospitalId,
    targetDept: targetDeptName,
    recognized: true,
    reason: `互认通过：${examResult.examType}结果出自互认名录医院，质量合格，剩余有效期 ${validDaysLeft} 天，${targetDeptName}直接采信、免于重查`,
    validDaysLeft,
    needReexam: false,
  };
}

/**
 * 登记一笔跨院资源调配（专家 / 设备支援，纯函数）。
 *
 * 【数据隔离】from 与 to 两家医院必须已登记、且属于同一 groupId；
 *   跨集团调配直接抛错——不允许把 A 集团的设备 / 专家调去 B 集团。
 */
export function dispatchCrossHospitalResource(input: {
  resourceType: ResourceType;
  resourceName: string;
  fromHospitalId: string;
  toHospitalId: string;
  groupId: string;
  reason: string;
}): ResourceDispatch {
  const from = findHospital(input.fromHospitalId);
  const to = findHospital(input.toHospitalId);
  if (!from) throw new Error(`调出医院未登记：${input.fromHospitalId}`);
  if (!to) throw new Error(`调入医院未登记：${input.toHospitalId}`);
  if (from.hospitalId === to.hospitalId) throw new Error('院内支援不属跨院资源调配（数据隔离红线）');
  // 同集团校验：两家医院必须同 groupId，且与请求 groupId 一致
  if (from.groupId !== to.groupId) {
    throw new Error(`数据隔离：${from.name} 与 ${to.name} 不属于同一医疗集团，禁止跨集团调配`);
  }
  if (from.groupId !== (input.groupId ?? '').trim()) {
    throw new Error(`数据隔离：请求 groupId=${input.groupId} 与医院实际所属集团 ${from.groupId} 不一致`);
  }

  dispatchSeq += 1;
  const dispatch: ResourceDispatch = {
    dispatchId: `disp_${String(dispatchSeq).padStart(4, '0')}`,
    resourceType: input.resourceType,
    resourceName: (input.resourceName ?? '').trim(),
    fromHospitalId: from.hospitalId,
    toHospitalId: to.hospitalId,
    groupId: from.groupId,
    reason: (input.reason ?? '').trim(),
    createdAt: new Date().toISOString(),
  };
  dispatchStore.push(dispatch);
  return { ...dispatch };
}
