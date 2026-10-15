/**
 * 健澜科技 jlmedaios - 三甲评审准备系统聚合器（M141-A · 质量与安全）
 *
 * 【质量与安全】以评促建，三级医院评审七大类别核心条款的准备工作台。
 *
 * 七大类（覆盖《三级医院评审标准》核心条款，不漏项）：
 *   hospital_function 医院功能与任务
 *   medical_quality    医疗质量安全管理
 *   nursing_quality    护理质量管理
 *   pharmacy           药事管理
 *   infection_control 院感管理
 *   medical_records     病案管理
 *   hospital_admin     医院管理
 *
 * 状态三态（红黄绿）：
 *   met       已达标（绿）——制度落地、证据链完整
 *   improving 待改进（黄）——整改已启动、证据留痕中
 *   unmet     未达标（红）——差距项，须列入整改计划
 *
 * 状态机（trackReviewEvidence）：
 *   unmet  --留痕第 1 条证据-->  improving  --累计第 2 条证据-->  met
 *   met    仅追加证据，状态保持已达标。
 *
 * 全部为纯函数：不读库、不发请求、不触碰 WebSocket，便于单测与 BFF 路由复用；
 * 与 deploy/postgres/init/275-jci-review.sql 的 review_criterion 表口径同源。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 评审类别 key */
export type ReviewCategory =
  | 'hospital_function'
  | 'medical_quality'
  | 'nursing_quality'
  | 'pharmacy'
  | 'infection_control'
  | 'medical_records'
  | 'hospital_admin';

/** 状态三态（红黄绿） */
export type ReviewStatus = 'met' | 'improving' | 'unmet';

/** 证据类型 */
export type EvidenceType = 'document' | 'meeting' | 'data' | 'audit';

/** 证据材料（评审专家现场调阅） */
export interface EvidenceItem {
  /** 证据类型：制度文件 / 会议纪要 / 监测数据 / 内审记录 */
  type: EvidenceType;
  /** 证据引用（文件编号 / 链接 / 台账页码） */
  ref: string;
}

/** 评审条款 */
export interface Criterion {
  /** 条款编号，如 MQ-01 */
  id: string;
  /** 所属类别 */
  category: ReviewCategory;
  /** 评审细则条款号 */
  code: string;
  /** 条款标题 */
  title: string;
  /** 条款要求简述 */
  description: string;
  /** 红黄绿三态 */
  status: ReviewStatus;
  /** 责任科室 */
  ownerDept: string;
  /** 整改优先级 */
  priority: 'high' | 'medium' | 'low';
  /** 支撑证据链 */
  evidence: EvidenceItem[];
}

/** 差距报告条目（未达标 + 待改进） */
export interface GapItem {
  criterionId: string;
  title: string;
  category: ReviewCategory;
  categoryName: string;
  status: ReviewStatus;
  ownerDept: string;
  /** 整改优先级 */
  priority: 'high' | 'medium' | 'low';
  /** 已留痕证据数 */
  evidenceCount: number;
  /** 整改建议 */
  recommendation: string;
}

/** 差距分析报告 */
export interface GapReport {
  /** 条款总数 */
  totalCriteria: number;
  /** 三态计数 */
  counts: Record<ReviewStatus, number>;
  /** 已达标率 %（met / total，保留 1 位小数） */
  passRate: number;
  /** 整体灯：任一红=红，否则任一黄=黄，否则绿 */
  overall: 'green' | 'yellow' | 'red';
  /** 按类别统计 */
  byCategory: Array<{
    category: ReviewCategory;
    categoryName: string;
    total: number;
    met: number;
    improving: number;
    unmet: number;
    /** 该类别已达标率 % */
    rate: number;
  }>;
  /** 差距项（未达标优先，其次待改进；同状态按优先级高→低） */
  gaps: GapItem[];
}

/** 七大类元数据（顺序即评审手册章节顺序） */
export const REVIEW_CATEGORIES: Array<{ key: ReviewCategory; name: string }> = [
  { key: 'hospital_function', name: '医院功能与任务' },
  { key: 'medical_quality', name: '医疗质量安全管理' },
  { key: 'nursing_quality', name: '护理质量管理' },
  { key: 'pharmacy', name: '药事管理' },
  { key: 'infection_control', name: '院感管理' },
  { key: 'medical_records', name: '病案管理' },
  { key: 'hospital_admin', name: '医院管理' },
];

/** 类别 key → 中文名 */
export const CATEGORY_NAMES: Record<ReviewCategory, string> = REVIEW_CATEGORIES.reduce(
  (acc, c) => ({ ...acc, [c.key]: c.name }),
  {} as Record<ReviewCategory, string>,
);

/** 状态 → 中文名 / 灯色 */
export const STATUS_META: Record<ReviewStatus, { label: string; light: 'green' | 'yellow' | 'red' }> = {
  met: { label: '已达标', light: 'green' },
  improving: { label: '待改进', light: 'yellow' },
  unmet: { label: '未达标', light: 'red' },
};

/** 差距项整改建议模板（按状态） */
const GAP_RECOMMENDATION: Record<ReviewStatus, string> = {
  unmet: '制度尚未落地，须 30 日内完成制度修订、培训与首轮内审，补全证据链',
  improving: '整改已启动，按计划补齐支撑材料，复核通过后转已达标',
  met: '保持常态监测，证据链定期更新',
};

/** 条款种子目录（七大类别核心条款，与 review_criterion 表一一对应） */
type Seed = [string, ReviewCategory, string, string, string, ReviewStatus, string, 'high' | 'medium' | 'low', EvidenceItem[]?];

const SEED: Seed[] = [
  /* ---------- 医院功能与任务（6 条） ---------- */
  ['HF-01', 'hospital_function', '1.1.1', '医院功能与任务定位', '坚持公立医院公益性，明确功能定位与规模适宜', 'met', '院办公室', 'high', [{ type: 'document', ref: '制度-YW-2026-001《医院功能定位说明书》' }]],
  ['HF-02', 'hospital_function', '1.2.1', '发展规划与年度工作计划', '制定中长期发展规划，年度计划可量化、可考核', 'met', '院办公室', 'medium', [{ type: 'document', ref: '制度-GH-2026-002《十四五发展规划》' }]],
  ['HF-03', 'hospital_function', '1.4.3', '应急管理与灾害脆弱性分析', '每年开展灾害脆弱性分析，建立应急预警与响应机制', 'improving', '医务处', 'high', [{ type: 'data', ref: '台账-YJ-2026-Q3 脆弱性分析报告' }]],
  ['HF-04', 'hospital_function', '1.6.2', '患者权益与投诉管理', '落实患者知情同意与投诉接待、反馈闭环', 'met', '医务处', 'medium', [{ type: 'data', ref: '台账-TS-2026 投诉闭环率 98.2%' }]],
  ['HF-05', 'hospital_function', '1.7.1', '医学教育与人才培养', '承担教学、进修、继续教育任务并保障师资投入', 'met', '教育处', 'low', [{ type: 'document', ref: '制度-JY-2026-003《教学工作管理办法》' }]],
  ['HF-06', 'hospital_function', '1.8.1', '医院信息化建设', '电子病历应用水平达到分级评价要求，数据互联互通', 'improving', '信息科', 'high', [{ type: 'data', ref: '报告-EMR-2026 五级评审自评表' }]],

  /* ---------- 医疗质量安全管理（6 条） ---------- */
  ['MQ-01', 'medical_quality', '2.1.1', '医疗质量与安全管理体系', '建立院、科两级质量管理组织并定期运行', 'met', '医务处', 'high', [{ type: 'meeting', ref: '纪要-ZL-2026-Q3 质控委员会会议' }]],
  ['MQ-02', 'medical_quality', '2.2.1', '三级查房与首诊负责制度', '落实三级查房、首诊负责等核心医疗制度', 'met', '医务处', 'high', [{ type: 'audit', ref: '内审-CR-2026-Q3 核心制度抽查合格率 96%' }]],
  ['MQ-03', 'medical_quality', '2.2.3', '疑难病例与死亡病例讨论', '疑难、死亡病例按规定组织讨论并留痕', 'improving', '医务处', 'medium', [{ type: 'data', ref: '台账-TL-2026 死亡病例讨论率 88%' }]],
  ['MQ-04', 'medical_quality', '2.3.2', '手术分级管理制度', '手术医师授权管理与手术分级执行符合率', 'met', '医务处', 'high', [{ type: 'document', ref: '制度-SS-2026-004《手术分级授权目录》' }]],
  ['MQ-05', 'medical_quality', '2.4.1', '临床路径与单病种管理', '开展临床路径管理，单病种质量指标可监测', 'improving', '医务处', 'medium', [{ type: 'data', ref: '台账-LJ-2026-Q3 入径率 57%' }]],
  ['MQ-06', 'medical_quality', '2.5.1', '不良事件上报与根因分析', '医疗安全（不良）事件非惩罚性上报，重大事件 RCA', 'unmet', '医务处', 'high', []],

  /* ---------- 护理质量管理（5 条） ---------- */
  ['NQ-01', 'nursing_quality', '3.1.1', '护理质量与安全管理组织', '护理质量管理委员会按季度运行', 'met', '护理部', 'medium', [{ type: 'meeting', ref: '纪要-HL-2026-Q3 护理质控委员会' }]],
  ['NQ-02', 'nursing_quality', '3.2.1', '分级护理制度落实', '按护理级别落实巡视与基础护理', 'met', '护理部', 'high', [{ type: 'audit', ref: '内审-HL-2026-Q3 分级护理符合率 95%' }]],
  ['NQ-03', 'nursing_quality', '3.3.1', '护理不良事件管理', '跌倒、压疮、管路滑脱等事件上报与整改闭环', 'improving', '护理部', 'high', [{ type: 'data', ref: '台账-HL-2026 不良事件闭环率 76%' }]],
  ['NQ-04', 'nursing_quality', '3.4.1', '护士培训与岗位管理', '分层培训、能级对应与绩效考核机制', 'met', '护理部', 'low', [{ type: 'document', ref: '制度-HL-2026-005《护士分层培训方案》' }]],
  ['NQ-05', 'nursing_quality', '3.5.2', '危重症护理质量', 'ICU 护理质量指标监测达标', 'unmet', '护理部', 'high', []],

  /* ---------- 药事管理（5 条） ---------- */
  ['PH-01', 'pharmacy', '4.1.1', '药事管理与药物治疗学委员会', '药事会定期议事，重点监控药品目录动态调整', 'met', '药剂科', 'high', [{ type: 'meeting', ref: '纪要-YS-2026-Q3 药事与药物治疗学委员会' }]],
  ['PH-02', 'pharmacy', '4.2.1', '处方点评制度', '门急诊与住院处方点评覆盖、超常预警干预', 'met', '药剂科', 'high', [{ type: 'data', ref: '台账-CF-2026-Q3 处方点评合格率 94%' }]],
  ['PH-03', 'pharmacy', '4.3.1', '抗菌药物分级管理', '抗菌药物分级授权、使用强度控制达标', 'improving', '药剂科', 'high', [{ type: 'data', ref: '台账-KJ-2026-Q3 使用强度 38.5 DDD' }]],
  ['PH-04', 'pharmacy', '4.4.1', '临床药师制与药学监护', '重点科室配备临床药师，开展药学查房', 'improving', '药剂科', 'medium', [{ type: 'document', ref: '制度-YS-2026-006《临床药师工作规范》' }]],
  ['PH-05', 'pharmacy', '4.5.1', '特殊药品管理', '麻精毒放药品账物相符、双人双锁', 'met', '药剂科', 'high', [{ type: 'audit', ref: '内审-YP-2026-09 特药盘点账物相符' }]],

  /* ---------- 院感管理（5 条） ---------- */
  ['IC-01', 'infection_control', '5.1.1', '医院感染管理组织体系', '院感科独立设置，三级院感管理网络运行', 'met', '院感科', 'high', [{ type: 'document', ref: '制度-GR-2026-007《院感管理三级网络职责》' }]],
  ['IC-02', 'infection_control', '5.2.1', '手卫生依从性管理', '手卫生依从性与正确率监测、反馈', 'improving', '院感科', 'high', [{ type: 'data', ref: '台账-SW-2026-Q3 手卫生依从率 82%' }]],
  ['IC-03', 'infection_control', '5.3.1', '多重耐药菌防控', 'MDRO 主动筛查、接触隔离与环境消毒落实', 'met', '院感科', 'high', [{ type: 'audit', ref: '内审-MDRO-2026-Q3 隔离措施合格率 93%' }]],
  ['IC-04', 'infection_control', '5.4.1', '消毒灭菌与职业防护', '消毒供应中心质控与职业暴露处置流程', 'met', '院感科', 'medium', [{ type: 'document', ref: '制度-XD-2026-008《CSSD 质控标准》' }]],
  ['IC-05', 'infection_control', '5.5.1', '院感暴发应急处置', '暴发预警、流行病学调查与处置演练', 'unmet', '院感科', 'high', []],

  /* ---------- 病案管理（5 条） ---------- */
  ['MR-01', 'medical_records', '6.1.1', '病案管理组织与病案质量', '病案管理委员会运行，病历书写质控闭环', 'met', '病案室', 'medium', [{ type: 'meeting', ref: '纪要-BA-2026-Q3 病案管理委员会' }]],
  ['MR-02', 'medical_records', '6.2.1', '甲级病案率达标', '甲级病历率 ≥ 90%，丙级病历零发生', 'met', '病案室', 'high', [{ type: 'data', ref: '台账-BA-2026-Q3 甲级率 92.4%' }]],
  ['MR-03', 'medical_records', '6.3.1', '病案首页与编码质量', '首页主要诊断选择正确，ICD 编码准确率达标', 'improving', '病案室', 'high', [{ type: 'data', ref: '台账-BM-2026-Q3 编码抽查准确率 86%' }]],
  ['MR-04', 'medical_records', '6.4.1', '病历借阅与隐私保护', '病案借阅审批留痕，患者隐私脱敏', 'met', '病案室', 'medium', [{ type: 'document', ref: '制度-BA-2026-009《病案借阅与隐私保护办法》' }]],
  ['MR-05', 'medical_records', '6.5.1', '电子病历应用水平分级', '电子病历系统功能与应用水平分级评价达标', 'improving', '信息科', 'high', [{ type: 'data', ref: '报告-EMR-2026 五级评审自评表' }]],

  /* ---------- 医院管理（5 条） ---------- */
  ['HA-01', 'hospital_admin', '7.1.1', '院务公开与社会监督', '院务公开渠道畅通，行风评议持续改进', 'met', '纪检监察室', 'low', [{ type: 'document', ref: '制度-XF-2026-010《院务公开目录》' }]],
  ['HA-02', 'hospital_admin', '7.2.1', '财务与价格管理', '预算管理、收费价格公示与医保合规', 'met', '财务处', 'medium', [{ type: 'audit', ref: '内审-CW-2026-09 价格专项审计' }]],
  ['HA-03', 'hospital_admin', '7.3.1', '设备与耗材管理', '医疗设备预防性维护、高值耗材可追溯', 'improving', '设备科', 'medium', [{ type: 'data', ref: '台账-SB-2026-Q3 设备完好率 91%' }]],
  ['HA-04', 'hospital_admin', '7.4.1', '后勤保障与安全生产', '消防、压力容器等安全隐患排查闭环', 'unmet', '后勤保卫处', 'high', []],
  ['HA-05', 'hospital_admin', '7.5.1', '行风建设与职业道德', '医德考评建档，九项准则培训全覆盖', 'met', '纪检监察室', 'low', [{ type: 'document', ref: '制度-YX-2026-011《医德考评实施办法》' }]],
];

/** 深拷贝条款（纯函数：不污染种子数据） */
function cloneCriterion(s: Seed): Criterion {
  return {
    id: s[0],
    category: s[1],
    code: s[2],
    title: s[3],
    description: s[4],
    status: s[5],
    ownerDept: s[6],
    priority: s[7],
    evidence: (s[8] ?? []).map((e) => ({ ...e })),
  };
}

/**
 * 构建三甲评审检查清单（纯函数）。
 * 返回七大类别全部核心条款，顺序与评审手册章节一致。
 */
export function buildReviewChecklist(): Criterion[] {
  return SEED.map(cloneCriterion);
}

/** 按编号查找条款，找不到抛错（路由映射 400） */
function findCriterion(checklist: Criterion[], criterionId: string): Criterion {
  const hit = checklist.find((c) => c.id === criterionId);
  if (!hit) throw new Error(`评审条款不存在：${criterionId}`);
  return hit;
}

/**
 * 为某条款追加一条支撑证据（纯函数）。
 *
 * 状态机：
 *  - unmet 条款留痕第 1 条证据 → 自动转 improving（整改已启动）；
 *  - improving 条款累计第 2 条证据 → 自动转 met（证据链闭合）；
 *  - met 条款仅追加证据，状态保持已达标。
 *
 * 返回更新后的条款对象；调用方传入的 checklist 不被修改。
 */
export function trackReviewEvidence(
  criterionId: string,
  evidenceType: EvidenceType,
  evidenceRef: string,
  checklist: Criterion[] = buildReviewChecklist(),
): Criterion {
  const target = findCriterion(checklist, criterionId);

  const next: Criterion = {
    ...target,
    evidence: [...target.evidence, { type: evidenceType, ref: evidenceRef }],
  };

  const evidenceCount = next.evidence.length;
  if (next.status === 'unmet' && evidenceCount >= 1) {
    next.status = 'improving';
  } else if (next.status === 'improving' && evidenceCount >= 2) {
    next.status = 'met';
  }
  // met 保持不变

  return next;
}

/** 保留 1 位小数 */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** 状态 → 优先级权重（unmet > improving > met），用于差距清单排序 */
const STATUS_ORDER: Record<ReviewStatus, number> = { unmet: 0, improving: 1, met: 2 };
/** 整改优先级权重 */
const PRIORITY_ORDER: Record<'high' | 'medium' | 'low', number> = { high: 0, medium: 1, low: 2 };

/**
 * 生成评审差距分析报告（纯函数）。
 * 默认基于内置检查清单；可传入自行跟踪过证据的清单以反映最新进展。
 */
export function generateReviewGapReport(checklist: Criterion[] = buildReviewChecklist()): GapReport {
  const counts: Record<ReviewStatus, number> = { met: 0, improving: 0, unmet: 0 };
  for (const c of checklist) counts[c.status] += 1;

  const total = checklist.length;
  const passRate = total > 0 ? round1((counts.met / total) * 100) : 0;
  const overall: 'green' | 'yellow' | 'red' =
    counts.unmet > 0 ? 'red' : counts.improving > 0 ? 'yellow' : 'green';

  const byCategory = REVIEW_CATEGORIES.map((cat) => {
    const items = checklist.filter((c) => c.category === cat.key);
    const m = items.filter((c) => c.status === 'met').length;
    const i = items.filter((c) => c.status === 'improving').length;
    const u = items.filter((c) => c.status === 'unmet').length;
    return {
      category: cat.key,
      categoryName: cat.name,
      total: items.length,
      met: m,
      improving: i,
      unmet: u,
      rate: items.length > 0 ? round1((m / items.length) * 100) : 0,
    };
  });

  // 差距项：未达标 + 待改进；未达标优先，同状态按整改优先级高→低，再按编号
  const gaps: GapItem[] = checklist
    .filter((c) => c.status !== 'met')
    .map((c) => ({
      criterionId: c.id,
      title: c.title,
      category: c.category,
      categoryName: CATEGORY_NAMES[c.category],
      status: c.status,
      ownerDept: c.ownerDept,
      priority: c.priority,
      evidenceCount: c.evidence.length,
      recommendation: GAP_RECOMMENDATION[c.status],
    }))
    .sort(
      (a, b) =>
        STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
        a.criterionId.localeCompare(b.criterionId),
    );

  return { totalCriteria: total, counts, passRate, overall, byCategory, gaps };
}
