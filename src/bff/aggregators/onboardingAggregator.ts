/**
 * 健澜科技 jlmedaios - 后继者入职向导 Onboarding（M115-C）
 *
 * 依据宪法第七章 7.8「后继者机制」：
 *  新员工（医生 / 护士 / 药师）入职时，自动加载本科室基线
 * （deptBaseline），把前辈们沉淀的高频成功经验与必读教训
 * 一次性编成「入职向导」，先读教训再上手决策。
 *
 * 本聚合器是纯函数核心（不触库、无副作用、可直接单测）：
 *  - buildNewHireOnboarding(role, deptCode, deptMuse)：
 *      消费 M114 buildDeptMuse 的产物 DeptMuse，
 *      输出欢迎语 + Top5 高频成功经验 + Top3 重要教训 +
 *      科室推荐学习路径（deptPath）；
 *  - 空科室（staffSize=0）兜底：返回结构完整的零值结果，
 *    绝不抛异常，deptPath 给出「联系带教老师」的冷启动指引。
 *
 * 注意：本聚合器不做排序——deptMuse.topDecisions / topFailures
 * 在 M114 已按频次三级排序，这里只做「截断 + 字段投影 + 文案组装」。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type {
  AggregatedMuseTopic,
  DeptMuse,
  StaffRole,
} from './deptMuseAggregator';

/* ------------------------------- 类型契约 ------------------------------- */

/** 向导中的单条经验（成功 / 教训同构，由分桶来源区分） */
export interface OnboardingExperienceItem {
  /** 决策要点主题 */
  topic: string;
  /** 代表性经验正文 */
  content: string;
  /** 跨员工累计决策次数（高频口径） */
  totalCount: number;
  /** 参与该决策的员工数 */
  staffCount: number;
  /** 涉及角色（doctor→nurse→pharmacist canonical 顺序） */
  roles: StaffRole[];
  /** 按决策次数加权的平均有效率 0~1 */
  avgSuccessRate: number;
}

/** buildNewHireOnboarding 总产出 */
export interface NewHireOnboarding {
  /** 欢迎语：「欢迎加入XX科，您的前辈们留下了 N 条经验。」 */
  welcomeMessage: string;
  /** 前辈沉淀的经验总条数（= 科室基线 totalEntries） */
  totalExperiences: number;
  /** Top5 高频成功经验（按频次降序） */
  topSuccesses: OnboardingExperienceItem[];
  /** Top3 重要教训（红色高亮展示，先避坑再上手） */
  topLessons: OnboardingExperienceItem[];
  /** 科室推荐学习路径（有序步骤文案） */
  deptPath: string[];
}

/* ------------------------------- 常量与工具 ------------------------------- */

/** 成功经验上榜条数（高频模仿清单） */
export const MAX_TOP_SUCCESSES = 5;
/** 教训上榜条数（必读避坑清单，短以便精读） */
export const MAX_TOP_LESSONS = 3;

/** 岗位角色 → 中文称呼（未知角色回落「同事」） */
const ROLE_LABEL: Record<string, string> = {
  doctor: '医生',
  nurse: '护士',
  pharmacist: '药师',
  admin: '管理员',
};

/** 科室编码 → 科室名（常见科室；未命中时回落「{code}科」） */
const DEPT_LABEL: Record<string, string> = {
  'DEP-IM': '内科',
  'DEP-SUR': '外科',
  'DEP-PED': '儿科',
  'DEP-OB': '妇产科',
  'DEP-EMG': '急诊科',
  'DEP-ICU': '重症医学科',
  'DEP-CARD': '心血管内科',
  'DEP-NEU': '神经内科',
};

/** 岗位角色中文称呼（防御未知值） */
function roleLabelOf(role: string): string {
  return ROLE_LABEL[role] ?? '同事';
}

/** 科室展示名（防御空串 / 未命中等） */
function deptLabelOf(deptCode: string): string {
  const code = (deptCode ?? '').trim();
  if (!code) return '本科室';
  return DEPT_LABEL[code] ?? `${code}科`;
}

/** 把 M114 聚合主题投影为向导经验条目（lesson 标记在分桶阶段已分离） */
function toItem(t: AggregatedMuseTopic): OnboardingExperienceItem {
  return {
    topic: t.topic,
    content: t.content,
    totalCount: t.totalCount,
    staffCount: t.staffCount,
    roles: t.roles,
    avgSuccessRate: t.avgSuccessRate,
  };
}

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * buildNewHireOnboarding：后继者入职向导总入口（依据宪法第七章 7.8）。
 *
 * 流程：
 *  1. 防御入参：deptMuse 为空时按空科室基线处理，绝不抛错；
 *  2. Top5 高频成功经验 = deptMuse.topDecisions 截断（已按频次降序）；
 *  3. Top3 重要教训 = deptMuse.topFailures 截断（失败经验单独成桶）；
 *  4. 欢迎语拼装：科室名 + 角色称呼 + 前辈经验总条数；
 *  5. 科室推荐路径：研读基线 → 模仿高频决策 → 牢记教训 →
 *     带教下首例独立决策并复盘归档。
 *
 * 纯函数：不修改入参，空科室返回结构完整的零值结果。
 *
 * @param role 新员工岗位角色（doctor / nurse / pharmacist…）
 * @param deptCode 科室编码
 * @param deptMuse M114 buildDeptMuse 的产物（可为 null/undefined）
 * @returns 欢迎语、Top5 成功、Top3 教训与推荐路径四件套
 */
export function buildNewHireOnboarding(
  role: string,
  deptCode: string,
  deptMuse: DeptMuse | null | undefined,
): NewHireOnboarding {
  const deptLabel = deptLabelOf(deptCode);
  const roleLabel = roleLabelOf(role);

  const baseline = deptMuse?.deptBaseline;
  const staffSize = baseline?.staffSize ?? 0;
  const totalExperiences = baseline?.totalEntries ?? 0;

  /* 空科室兜底：前辈尚无经验沉淀，deptPath 给冷启动指引 */
  if (staffSize === 0) {
    return {
      welcomeMessage: `欢迎加入${deptLabel}，您的前辈们尚未沉淀任何经验。`,
      totalExperiences: 0,
      topSuccesses: [],
      topLessons: [],
      deptPath: [
        `当前科室暂无前辈经验沉淀，请联系科教科分配带教老师，先从科室诊疗规范手册学起；作为${roleLabel}，请在带教下完成首周跟岗后再独立决策。`,
      ],
    };
  }

  /* Top5 成功 / Top3 教训（M114 已排序，此处只截断投影） */
  const topSuccesses = (deptMuse!.topDecisions ?? [])
    .slice(0, MAX_TOP_SUCCESSES)
    .map(toItem);
  const topLessons = (deptMuse!.topFailures ?? [])
    .slice(0, MAX_TOP_LESSONS)
    .map(toItem);

  const welcomeMessage = `欢迎加入${deptLabel}，${roleLabel}新同事：您的前辈们留下了 ${totalExperiences} 条经验。`;

  /* 科室推荐路径（有序；空段自动跳过，保证步骤文案连续） */
  const deptPath: string[] = [];
  const baselineTopics = baseline?.baselineTopics ?? [];
  if (baselineTopics.length > 0) {
    deptPath.push(
      `第1步 · 研读科室基线：${baselineTopics.slice(0, 3).join('、')}。`,
    );
  }
  if (topSuccesses.length > 0) {
    deptPath.push(
      `第2步 · 模仿高频成功决策：${topSuccesses
        .slice(0, 3)
        .map((t) => t.topic)
        .join('、')}。`,
    );
  }
  if (topLessons.length > 0) {
    deptPath.push(
      `第3步 · 牢记必读教训（先避坑再上手）：${topLessons
        .slice(0, 3)
        .map((t) => t.topic)
        .join('、')}。`,
    );
  }
  deptPath.push(
    `第4步 · 在带教老师指导下以${roleLabel}身份完成首例独立决策，并复盘归档进科室经验库。`,
  );

  return {
    welcomeMessage,
    totalExperiences,
    topSuccesses,
    topLessons,
    deptPath,
  };
}
