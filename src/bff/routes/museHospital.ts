/**
 * 健澜科技 jlmedaios - 全院智慧资产看板路由（院长版 M116-D）
 *
 * 依据宪法第七章「Doctor MUSE / 全角色 Personal Agent」：
 *   GET /api/v1/muse/hospital —— 全院智慧资产总览，仅院长 / admin 可访问：
 *     全院经验总量 / 教训总量 / 活跃沉淀员工数 / 科室经验横向对比 /
 *     按月增长趋势；带 ?topic= 时额外返回该主题全院专家榜（人才地图）。
 *
 * 权限边界（依据第七章 7.9 全院视角的敏感性）：
 *  - 仅 admin 或院长（role 含 'dean' / '院长'）可访问；
 *  - 其余角色一律 403 FORBIDDEN，不返回任何全院聚合明细；
 *  - 本端点纯只读，不触发任何决策写入；返回均为岗位级聚合，
 *    不含患者直接标识符。
 *
 * 医疗安全：DEMO_MODE=1 时走进程内样例数据，不连 PostgreSQL、不抛错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '@/db/pool.js';
import { requireAuth } from '../middleware/auth';
import {
  buildHospitalWisdomDashboard,
  rankExpertsByTopic,
  type HospitalStaffMuseEntry,
  type KnowledgeAsset,
  type LessonRecord,
  type TopicExpert,
} from '../aggregators/hospitalWisdomAggregator';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 无 DB 演示模式：走进程内样例，不连 PostgreSQL */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/* ------------------------------------------------------------------ */
/* 权限守卫（纯函数，便于单测角色差异）                                   */
/* ------------------------------------------------------------------ */

/** 当前登录用户最小形状（与 Ctx.user 对齐） */
interface HospitalUser {
  roles: string[];
}

/**
 * requireHospitalDean：判定是否院长 / admin。
 * 规则：roles 含 'admin'，或小写含 'dean'，或含「院长」字样即放行。
 * @returns true = 放行；false = 权限不足
 */
export function requireHospitalDean(user: HospitalUser | null): boolean {
  if (!user) return false;
  const hay = (user.roles ?? []).join(' ').toLowerCase();
  if (user.roles.includes('admin')) return true;
  if (hay.includes('dean') || (user.roles ?? []).some((r) => r.includes('院长'))) {
    return true;
  }
  return false;
}

/* ------------------------------------------------------------------ */
/* DB 装载（宽松塑形，列缺失/异常不炸路由）                             */
/* ------------------------------------------------------------------ */

/** staff_decision_memory 一行的宽松读取 */
interface MemoryRow {
  staff_id: unknown;
  name: unknown;
  role: unknown;
  decision: unknown;
  outcome: unknown;
  created_at: unknown;
  lesson: unknown;
}

/** 把 DB 决策记忆行塑形为聚合器入参（dept 信息缺失时回落空科室桶） */
function toEntry(r: MemoryRow): HospitalStaffMuseEntry {
  const decision = typeof r.decision === 'string' ? r.decision : '';
  const isFailure = r.outcome === 'failure';
  return {
    staffId: String(r.staff_id ?? ''),
    staffName: typeof r.name === 'string' && r.name.trim() ? r.name : '未命名员工',
    role: r.role === 'nurse' || r.role === 'pharmacist' ? r.role : 'doctor',
    deptCode: '',
    deptName: '',
    topic: decision,
    content: typeof r.lesson === 'string' && r.lesson ? r.lesson : decision,
    decisionCount: 1,
    isFailure,
    successRate: isFailure ? 0 : 1,
    createdAt: typeof r.created_at === 'string' ? r.created_at : undefined,
  };
}

/** 从 DB 拉取全院决策记忆 + 员工画像，装配聚合器三入参 */
async function buildView(): Promise<{
  allStaffMuse: HospitalStaffMuseEntry[];
  knowledge: KnowledgeAsset[];
  lessons: LessonRecord[];
}> {
  const db = getDb();
  const rows = (await db`
    SELECT m.staff_id, p.name, p.role, m.decision, m.outcome, m.created_at, m.lesson
    FROM medmuse.staff_decision_memory m
    LEFT JOIN medmuse.staff_muse_profile p ON p.staff_id = m.staff_id
    ORDER BY m.created_at DESC
    LIMIT 2000
  `) as MemoryRow[];

  const allStaffMuse = rows.map(toEntry);
  // 教训台账：与失败决策同口径（7.7 单独成桶）
  const lessons: LessonRecord[] = rows
    .filter((r) => r.outcome === 'failure')
    .map((r, i) => ({
      lessonId: `lesson-${i}`,
      topic: typeof r.decision === 'string' ? r.decision : '',
      deptCode: '',
      createdAt: typeof r.created_at === 'string' ? r.created_at : undefined,
    }));
  // 知识资产：本端点只读经验侧，知识表接入后在此扩展（当前空集兜底）
  const knowledge: KnowledgeAsset[] = [];
  return { allStaffMuse, knowledge, lessons };
}

/* ------------------------------------------------------------------ */
/* 演示样例：三个科室近半年逐步沉淀                                      */
/* ------------------------------------------------------------------ */

function demoView(): {
  allStaffMuse: HospitalStaffMuseEntry[];
  knowledge: KnowledgeAsset[];
  lessons: LessonRecord[];
} {
  const at = (ym: string, day = 10): string =>
    `${ym}-${String(day).padStart(2, '0')}T09:00:00.000Z`;

  const allStaffMuse: HospitalStaffMuseEntry[] = [
    // 心内科
    { staffId: 's-cardiology-1', staffName: '王主任', role: 'doctor', deptCode: 'DEP-CARD', deptName: '心血管内科', topic: 'STEMI 急诊再灌注', content: '门-囊时间≤90min', decisionCount: 46, isFailure: false, successRate: 0.95, createdAt: at('2026-06') },
    { staffId: 's-cardiology-1', staffName: '王主任', role: 'doctor', deptCode: 'DEP-CARD', deptName: '心血管内科', topic: 'STEMI 急诊再灌注', content: '门-囊时间≤90min', decisionCount: 52, isFailure: false, successRate: 0.96, createdAt: at('2026-08') },
    { staffId: 's-cardiology-2', staffName: '李医生', role: 'doctor', deptCode: 'DEP-CARD', deptName: '心血管内科', topic: '抗凝桥接窗口', content: '桥接推迟24h', decisionCount: 18, isFailure: false, successRate: 0.88, createdAt: at('2026-07') },
    // 呼吸内科
    { staffId: 's-resp-1', staffName: '张主任', role: 'doctor', deptCode: 'DEP-RESP', deptName: '呼吸与危重症医学科', topic: 'CAP 经验性抗感染', content: '首选阿莫西林克拉维酸', decisionCount: 63, isFailure: false, successRate: 0.93, createdAt: at('2026-08') },
    { staffId: 's-resp-2', staffName: '刘护士', role: 'nurse', deptCode: 'DEP-RESP', deptName: '呼吸与危重症医学科', topic: '跌倒初筛', content: 'Morse≥45 干预', decisionCount: 27, isFailure: false, successRate: 0.9, createdAt: at('2026-07') },
    // 普外科
    { staffId: 's-surg-1', staffName: '陈主任', role: 'doctor', deptCode: 'DEP-SURG', deptName: '普外科', topic: '术后早期康复', content: '术后第1天下床', decisionCount: 35, isFailure: false, successRate: 0.91, createdAt: at('2026-08') },
    { staffId: 's-surg-2', staffName: '赵药师', role: 'pharmacist', deptCode: 'DEP-SURG', deptName: '普外科', topic: '围术期预防用药', content: '切皮前30min给药', decisionCount: 21, isFailure: false, successRate: 0.97, createdAt: at('2026-06') },
  ];

  const knowledge: KnowledgeAsset[] = [
    { knowledgeId: 'k1', title: 'STEMI 绿色通道 SOP', deptCode: 'DEP-CARD', topic: 'STEMI 急诊再灌注', createdAt: at('2026-07') },
    { knowledgeId: 'k2', title: 'CAP 诊疗路径', deptCode: 'DEP-RESP', topic: 'CAP 经验性抗感染', createdAt: at('2026-08') },
  ];

  const lessons: LessonRecord[] = [
    { lessonId: 'l1', topic: '抗凝桥接窗口', deptCode: 'DEP-CARD', createdAt: at('2026-05') },
    { lessonId: 'l2', topic: '术后发热鉴别', deptCode: 'DEP-SURG', createdAt: at('2026-08') },
  ];

  return { allStaffMuse, knowledge, lessons };
}

/* ------------------------------------------------------------------ */
/* 路由                                                                */
/* ------------------------------------------------------------------ */

export const museHospitalRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/muse/hospital',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAuth(c);
      if (denied) return denied;

      // 权限：仅院长 / admin（依据宪法第七章 7.9 全院视角）
      if (!requireHospitalDean(c.user)) {
        return json(
          fail(ErrorCode.FORBIDDEN, '权限不足：全院智慧资产看板仅院长 / admin 可访问', c.traceId),
          403,
        );
      }

      try {
        const { allStaffMuse, knowledge, lessons } = isDemo
          ? demoView()
          : await buildView();

        const dashboard = buildHospitalWisdomDashboard(allStaffMuse, knowledge, lessons);

        // 可选：?topic= 返回该主题全院专家榜（人才地图）
        const topic = (c.query.get('topic') ?? '').trim();
        let experts: TopicExpert[] = [];
        if (topic) {
          experts = rankExpertsByTopic(topic, allStaffMuse);
        }

        return json(
          ok(
            {
              demo: isDemo,
              ...dashboard,
              experts,
              requestedTopic: topic || null,
            },
            '全院智慧资产总览',
            c.traceId,
          ),
        );
      } catch (err) {
        console.error(`[museHospital] GET /hospital [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, '全院智慧资产看板加载失败', c.traceId),
          500,
        );
      }
    },
  },
];
