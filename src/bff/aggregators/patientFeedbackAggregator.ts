/**
 * 健澜科技 jlmedaios - M122-D 患者满意度反馈聚合器
 *
 * 依据宪法第四十五条（发展医疗卫生事业、保护人民健康）：
 * 把患者分散的评分与文字意见，聚合成「科室满意度排名 / 高频问题 / 改进方向」，
 * 供管理员闭环改进医疗服务质量。
 *
 * 本模块为纯函数集合，不依赖数据库、不依赖时间，便于单测与复用：
 *   - analyzePatientFeedback：入口，一次算出三块结果；
 *   - 其余导出函数为可单独断言的细分步骤。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 单条患者反馈（与 medmuse.patient_feedback 行对齐，去掉自增 id） */
export interface PatientFeedbackItem {
  patientId: string;
  visitId: string;
  doctorId?: string;
  deptCode: string;
  /** 1-5 分，5 最满意 */
  rating: number;
  /** 自由文本意见，可空 */
  comment?: string | null;
  createdAt?: string;
}

/** 科室满意度排名条目 */
export interface DeptSatisfaction {
  deptCode: string;
  /** 平均评分，保留两位小数 */
  avgRating: number;
  /** 该科室有效评价条数 */
  count: number;
}

/** 高频问题条目 */
export interface TopIssue {
  /** 问题类别键，如 wait / attitude */
  key: string;
  /** 中文标签，如 候诊等待 */
  label: string;
  /** 命中该问题的反馈条数 */
  count: number;
}

/** 改进方向条目 */
export interface ImprovementArea {
  area: string;
  label: string;
  /** 触发该改进方向的低分（<=3）反馈条数 */
  count: number;
}

/** analyzePatientFeedback 输出 */
export interface FeedbackAnalysis {
  /** 科室满意度排名，按均分从高到低 */
  deptSatisfactionRank: DeptSatisfaction[];
  /** 高频问题 Top N，按命中数从高到低 */
  topIssues: TopIssue[];
  /** 改进方向（来自低分反馈归类） */
  improvementAreas: ImprovementArea[];
  /** 总评价条数 */
  total: number;
  /** 总体均分，保留两位小数；无数据为 0 */
  overallAvg: number;
}

/**
 * 问题关键词词典：把自由文本意见映射到有限的问题类别。
 * 依据宪法：用患者听得懂的词，把意见结构化，才能真正拿来改进。
 */
const ISSUE_DICT: ReadonlyArray<{ key: string; label: string; keywords: string[] }> = [
  { key: 'wait', label: '候诊等待', keywords: ['等待', '候诊', '排队', '等太久', '时间长', '慢'] },
  { key: 'attitude', label: '服务态度', keywords: ['态度', '冷漠', '凶', '不耐烦', '敷衍', '不理'] },
  { key: 'cost', label: '费用收费', keywords: ['费用', '收费', '贵', '报销', '太贵', '价钱'] },
  { key: 'environment', label: '就医环境', keywords: ['环境', '卫生', '脏', '吵', '挤', '气味'] },
  { key: 'pharmacy', label: '取药药房', keywords: ['取药', '药房', '拿药', '发药'] },
  { key: 'registration', label: '挂号窗口', keywords: ['挂号', '窗口', '收费处'] },
  { key: 'communication', label: '沟通解释', keywords: ['解释', '说不清', '没讲', '告知', '沟通'] },
];

/** 低分阈值：评分 <= LOW_RATING 视为不满意，触发改进方向归类 */
const LOW_RATING = 3;

/** 四舍五入到两位小数 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * 科室满意度排名：按 deptCode 分组求均分，按均分降序。
 * 空科室编码归入「未指定」桶，避免丢弃数据。
 */
export function rankByDept(feedbackList: PatientFeedbackItem[]): DeptSatisfaction[] {
  const groups = new Map<string, { sum: number; count: number }>();
  for (const f of feedbackList) {
    if (!Number.isFinite(f.rating)) continue;
    const dept = f.deptCode && f.deptCode.trim() ? f.deptCode.trim() : 'UNKNOWN';
    const g = groups.get(dept) ?? { sum: 0, count: 0 };
    g.sum += f.rating;
    g.count += 1;
    groups.set(dept, g);
  }
  return [...groups.entries()]
    .map(([deptCode, g]) => ({
      deptCode,
      avgRating: round2(g.count ? g.sum / g.count : 0),
      count: g.count,
    }))
    .sort((a, b) => b.avgRating - a.avgRating || b.count - a.count);
}

/**
 * 从自由文本意见中提取高频问题。
 * 一条评论命中同一类别多次只计一次（按反馈条数统计，而非词频）。
 */
export function extractTopIssues(
  feedbackList: PatientFeedbackItem[],
  limit = 5,
): TopIssue[] {
  const counter = new Map<string, number>();
  for (const f of feedbackList) {
    const text = (f.comment ?? '').trim();
    if (!text) continue;
    for (const issue of ISSUE_DICT) {
      const hit = issue.keywords.some((kw) => text.includes(kw));
      if (hit) counter.set(issue.key, (counter.get(issue.key) ?? 0) + 1);
    }
  }
  const labelOf = new Map(ISSUE_DICT.map((d) => [d.key, d.label]));
  return [...counter.entries()]
    .map(([key, count]) => ({ key, label: labelOf.get(key) ?? key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key))
    .slice(0, limit);
}

/**
 * 改进方向：只看低分（<=3）反馈，把它们按命中的问题类别归类。
 * 没有命中任何关键词的低分反馈，统一归入「other 其他」，保证不丢问题。
 */
export function deriveImprovementAreas(
  feedbackList: PatientFeedbackItem[],
  limit = 5,
): ImprovementArea[] {
  const counter = new Map<string, number>();
  let other = 0;
  for (const f of feedbackList) {
    if (!Number.isFinite(f.rating) || f.rating > LOW_RATING) continue;
    const text = (f.comment ?? '').trim();
    let hitAny = false;
    for (const issue of ISSUE_DICT) {
      const hit = issue.keywords.some((kw) => text.includes(kw));
      if (hit) {
        counter.set(issue.key, (counter.get(issue.key) ?? 0) + 1);
        hitAny = true;
      }
    }
    if (!hitAny) other += 1;
  }
  if (other > 0) counter.set('other', other);
  const labelOf = new Map(ISSUE_DICT.map((d) => [d.key, d.label]));
  labelOf.set('other', '其他综合');
  return [...counter.entries()]
    .map(([area, count]) => ({ area, label: labelOf.get(area) ?? area, count }))
    .sort((a, b) => b.count - a.count || a.area.localeCompare(b.area))
    .slice(0, limit);
}

/**
 * 入口：一次算出患者满意度反馈的三块聚合结果。
 * 纯函数：相同输入必得相同输出，不读库、不读时间。
 */
export function analyzePatientFeedback(
  feedbackList: PatientFeedbackItem[],
): FeedbackAnalysis {
  const list = Array.isArray(feedbackList) ? feedbackList : [];
  const total = list.length;
  // 仅对有效（有限数字）评分求均分，脏数据不计入分母
  const valid = list.filter((f) => Number.isFinite(f.rating));
  const validSum = valid.reduce((s, f) => s + f.rating, 0);
  return {
    deptSatisfactionRank: rankByDept(list),
    topIssues: extractTopIssues(list),
    improvementAreas: deriveImprovementAreas(list),
    total,
    overallAvg: valid.length ? round2(validSum / valid.length) : 0,
  };
}
