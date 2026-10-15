/**
 * 健澜科技 jlmedaios - 患者移动端 H5 首页聚合器（M128-C）
 *
 * 面向中老年患者本人的移动端首页聚合：今日提醒（用药 / 复诊 / 检查）、
 * 最近报告、智能导诊、满意度评价。依据《中华人民共和国宪法》第四十五条：
 * 国家发展医疗卫生事业、保护人民健康，本模块以大字大按钮、易懂文案的
 * 方式帮助患者自我管理，不替代医师诊疗判断。
 *
 * 移动端 + 性能优化：纯函数、无 IO、无网络、无 WebSocket 依赖；
 * now 由调用方注入，便于单测与缓存；输出对象一次性构建，避免重复遍历。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 输入 / 输出类型                                                      */
/* ------------------------------------------------------------------ */

/** 今日提醒业务类型：用药 / 复诊 / 检查 */
export type MobileReminderType = 'medication' | 'appointment' | 'exam';

/** 提醒紧迫度：urgent 两小时内 / warning 临近或逾期 / normal 常规 */
export type MobileReminderLevel = 'urgent' | 'warning' | 'normal';

/** 单条今日提醒 */
export interface MobileReminder {
  id: string;
  type: MobileReminderType;
  level: MobileReminderLevel;
  title: string;
  body: string;
  /** 提醒触发时间（ISO datetime） */
  dueAt: string;
}

/** 最近一份报告 */
export interface MobileReport {
  id: string;
  name: string;
  /** 报告日期（ISO date / datetime） */
  reportDate: string;
  /** available 已出报告 / pending 出报告中 */
  status: 'available' | 'pending';
  /** 一句话摘要，可空 */
  summary?: string | null;
}

/** 智能导诊入口配置 */
export interface MobileGuideEntry {
  /** 是否开放智能导诊入口 */
  available: boolean;
  /** 快捷症状入口标签（供大按钮直达） */
  quickSymptoms: string[];
}

/** 满意度评价入口配置 */
export interface MobileSatisfactionEntry {
  /** 是否有待评价 */
  pending: boolean;
  /** 最近一次评分 1-5，可空 */
  lastScore?: number | null;
}

/** buildPatientMobileHome 的原始输入（由路由装配） */
export interface PatientMobileHomeInput {
  reminders?: MobileReminder[];
  reports?: MobileReport[];
  guide?: Partial<MobileGuideEntry>;
  satisfaction?: Partial<MobileSatisfactionEntry>;
}

/** 移动端首页聚合结果 */
export interface PatientMobileHome {
  patientId: string;
  /** 时段问候语，如「早上好」 */
  greeting: string;
  /** 今日提醒（已按紧迫度 + 时间排序） */
  todayReminders: MobileReminder[];
  /** 今日提醒总条数 */
  reminderCount: number;
  /** 紧急提醒条数 */
  urgentCount: number;
  /** 最近报告（按日期倒序，限量） */
  recentReports: MobileReport[];
  /** 智能导诊入口 */
  smartGuide: MobileGuideEntry;
  /** 满意度评价入口 */
  satisfaction: MobileSatisfactionEntry;
  /** 聚合时间（ISO datetime） */
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/* 常量与小工具                                                        */
/* ------------------------------------------------------------------ */

/** 移动端 + 性能优化：今日提醒最多展示条数，避免长列表拖慢中老年滑动 */
const MAX_TODAY_REMINDERS = 10;
/** 移动端 + 性能优化：最近报告最多展示条数 */
const MAX_RECENT_REPORTS = 5;

/** 紧迫度排序权重：数值越小越靠前 */
const LEVEL_RANK: Record<MobileReminderLevel, number> = {
  urgent: 0,
  warning: 1,
  normal: 2,
};

function toDate(v: Date | string | null | undefined): Date {
  if (v instanceof Date) return v;
  if (v) return new Date(v);
  return new Date();
}

/** 按时段生成问候语 */
function greetingOf(now: Date): string {
  const h = now.getHours();
  if (h < 5) return '夜深了';
  if (h < 9) return '早上好';
  if (h < 12) return '上午好';
  if (h < 14) return '中午好';
  if (h < 18) return '下午好';
  return '晚上好';
}

/* ------------------------------------------------------------------ */
/* 纯函数：移动端首页聚合（M128-C 核心规则，单测覆盖）                  */
/* ------------------------------------------------------------------ */

/**
 * 患者移动端首页聚合纯函数。
 *
 * 移动端 + 性能优化：
 * 1. 不读外部状态、不发网络请求、不触碰 WebSocket；
 * 2. 输入数组先拷贝再排序，避免污染调用方原始数据；
 * 3. 提醒按「紧迫度 → 时间」排序后限量，报告按日期倒序限量；
 * 4. now 注入，便于缓存与单测。
 *
 * @param patientId 患者 ID（仅回显，不参与规则分支）
 * @param data      原始输入：提醒 / 报告 / 导诊 / 满意度
 * @param now       当前时间，Date 或 ISO 字符串（便于测试）
 */
export function buildPatientMobileHome(
  patientId: string,
  data: PatientMobileHomeInput = {},
  now: Date | string = new Date(),
): PatientMobileHome {
  const nowD = toDate(now);

  /* ---------- 1. 今日提醒：紧迫度优先，同紧迫度按时间升序 ---------- */
  // 依据宪法第四十五条：把最该先处理的用药/复诊/检查放在最前。
  const rawReminders = Array.isArray(data.reminders) ? data.reminders : [];
  const todayReminders = rawReminders
    .slice()
    .sort((a, b) => {
      const la = LEVEL_RANK[a.level] ?? LEVEL_RANK.normal;
      const lb = LEVEL_RANK[b.level] ?? LEVEL_RANK.normal;
      if (la !== lb) return la - lb;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    })
    .slice(0, MAX_TODAY_REMINDERS);

  const urgentCount = todayReminders.filter((r) => r.level === 'urgent').length;

  /* ---------- 2. 最近报告：按报告日期倒序，限量 ---------- */
  const rawReports = Array.isArray(data.reports) ? data.reports : [];
  const recentReports = rawReports
    .slice()
    .sort((a, b) => new Date(b.reportDate).getTime() - new Date(a.reportDate).getTime())
    .slice(0, MAX_RECENT_REPORTS);

  /* ---------- 3. 智能导诊入口：缺省开放，给一组中老年常见快捷症状 ---------- */
  const guide = data.guide ?? {};
  const quick = Array.isArray(guide.quickSymptoms) ? guide.quickSymptoms : [];
  const smartGuide: MobileGuideEntry = {
    available: guide.available ?? true,
    quickSymptoms:
      quick.length > 0 ? quick.slice(0, 6) : ['头疼', '发烧', '咳嗽', '肚子痛', '胸闷', '关节痛'],
  };

  /* ---------- 4. 满意度评价入口 ---------- */
  const sat = data.satisfaction ?? {};
  const satisfaction: MobileSatisfactionEntry = {
    pending: sat.pending ?? false,
    lastScore: typeof sat.lastScore === 'number' ? sat.lastScore : null,
  };

  return {
    patientId,
    greeting: greetingOf(nowD),
    todayReminders,
    reminderCount: todayReminders.length,
    urgentCount,
    recentReports,
    smartGuide,
    satisfaction,
    updatedAt: nowD.toISOString(),
  };
}

/* ------------------------------------------------------------------ */
/* 纯函数：面向中老年的移动端文案格式化                                 */
/* ------------------------------------------------------------------ */

/**
 * 移动端文案格式化：面向中老年患者，把脏文案规整成易读单行文本。
 *
 * 移动端 + 性能优化：一次正则替换完成，无字符串多次拼接。
 * 规则：
 * - null / undefined → 空串；
 * - 去首尾空白（含全角空格 \u3000）；
 * - 连续空白（含换行、制表、全角空格）折叠为半角单空格；
 * - 去掉不可见控制字符。
 */
export function formatPatientMobileText(text: unknown): string {
  if (text === null || text === undefined) return '';
  if (typeof text !== 'string') return '';
  return text
    // 去除常见控制字符（换行/制表/全角空格统一交给下面的折叠处理）
    .replace(/[\u0000-\u001F\u007F]/g, '')
    // 连续空白（含全角空格 \u3000）折叠为单空格
    .replace(/[\s\u3000]+/g, ' ')
    .trim();
}
