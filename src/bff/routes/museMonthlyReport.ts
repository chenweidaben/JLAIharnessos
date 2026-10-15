/**
 * 健澜科技 jlmedaios - 医院智慧资产月度报表路由（M119-C）
 *
 * 依据宪法第七章 7.2 / 7.7 / 7.9：
 *   GET /api/v1/muse/report/monthly?year=2026&month=10
 *     —— 全院员工 MUSE 决策经验按月切片，产出院长视角月度报表：
 *       新增经验总数 / 成功经验 / 失败教训 / 活跃员工 Top5 / 重点教训 Top3 /
 *       环比上月增长；同时返回可打印纯文本 text 供前端「下载」按钮落盘 .txt。
 *
 * 权限边界（依据第七章 7.9 全院视角的敏感性）：
 *  - 仅 admin 角色可访问（院长 / 职能科室主任）；
 *  - 普通员工访问 → 403 FORBIDDEN，不返回任何全院聚合明细；
 *  - 本端点纯只读，不触发任何决策写入；返回均为岗位级聚合，
 *    不含患者直接标识符。
 *
 * 医疗安全：DEMO_MODE=1 时走进程内样例数据，不连 PostgreSQL、不抛错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '@/db/pool.js';
import { requireRole } from '../middleware/auth';
import {
  formatWisdomReport,
  generateMonthlyWisdomReport,
  type WisdomExperience,
} from '../aggregators/monthlyWisdomReportAggregator';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 无 DB 演示模式：走进程内样例，不连 PostgreSQL */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/* ------------------------------------------------------------------ */
/* 查询参数解析（纯函数，便于单测）                                      */
/* ------------------------------------------------------------------ */

/** 解析并校验 year / month 查询参数；非法返回错误消息 */
export function parseYearMonth(
  rawYear: string | null,
  rawMonth: string | null,
): { year: number; month: number } | { error: string } {
  const year = Number(rawYear ?? '');
  const month = Number(rawMonth ?? '');
  if (!Number.isFinite(year) || year < 1900 || year > 2100) {
    return { error: 'year 需为 1900~2100 之间的四位数年份' };
  }
  if (!Number.isFinite(month) || month < 1 || month > 12) {
    return { error: 'month 需为 1~12 的整数' };
  }
  return { year: Math.floor(year), month: Math.floor(month) };
}

/* ------------------------------------------------------------------ */
/* DB 装载（宽松塑形，列缺失/异常不炸路由）                             */
/* ------------------------------------------------------------------ */

/** staff_decision_memory 一行的宽松读取（与 museHospital 同口径） */
interface MemoryRow {
  staff_id: unknown;
  name: unknown;
  dept_code: unknown;
  decision: unknown;
  outcome: unknown;
  created_at: unknown;
  lesson: unknown;
  decision_count: unknown;
}

/** 把 DB 决策记忆行塑形为聚合器入参 */
function toExperience(r: MemoryRow): WisdomExperience {
  const decision = typeof r.decision === 'string' ? r.decision : '';
  const isFailure = r.outcome === 'failure';
  return {
    staffId: String(r.staff_id ?? ''),
    staffName: typeof r.name === 'string' && r.name.trim() ? r.name : '未命名员工',
    deptCode: typeof r.dept_code === 'string' ? r.dept_code : '',
    topic: decision,
    decisionCount:
      typeof r.decision_count === 'number' && r.decision_count > 0
        ? Math.floor(r.decision_count)
        : 1,
    isFailure,
    successRate: isFailure ? 0 : 1,
    createdAt: typeof r.created_at === 'string' ? r.created_at : undefined,
  };
}

/** 从 DB 拉取全院决策记忆流水（近 14 个月窗口，覆盖本月 + 上月环比） */
async function loadAllExperiences(): Promise<WisdomExperience[]> {
  const db = getDb();
  const rows = (await db`
    SELECT m.staff_id, p.name, p.dept_code, m.decision, m.outcome, m.created_at, m.lesson, m.decision_count
    FROM medmuse.staff_decision_memory m
    LEFT JOIN medmuse.staff_muse_profile p ON p.staff_id = m.staff_id
    WHERE m.created_at >= NOW() - INTERVAL '14 months'
    ORDER BY m.created_at DESC
    LIMIT 5000
  `) as MemoryRow[];
  return rows.map(toExperience);
}

/* ------------------------------------------------------------------ */
/* 演示数据：覆盖本月 / 上月 / 失败教训三桶                            */
/* ------------------------------------------------------------------ */

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** 构造演示经验流水：传入目标年月，样例 createdAt 落在当月与上月 */
function demoExperiences(year: number, month: number): WisdomExperience[] {
  const cur = `${year}-${pad2(month)}-15T09:00:00.000Z`;
  const prev = month === 1 ? `${year - 1}-12-15T09:00:00.000Z` : `${year}-${pad2(month - 1)}-15T09:00:00.000Z`;
  return [
    { staffId: 's001', staffName: '陈主任', deptCode: '内一', topic: 'CAP 经验性抗感染首选', decisionCount: 12, isFailure: false, createdAt: cur },
    { staffId: 's001', staffName: '陈主任', deptCode: '内一', topic: '脓毒症早期液体复苏', decisionCount: 8, isFailure: false, createdAt: cur },
    { staffId: 's002', staffName: '李护士长', deptCode: '急诊', topic: '胸痛三联症分诊', decisionCount: 10, isFailure: false, createdAt: cur },
    { staffId: 's002', staffName: '李护士长', deptCode: '急诊', topic: '胺碘酮外渗处理不及时', decisionCount: 2, isFailure: true, createdAt: cur },
    { staffId: 's003', staffName: '王药师', deptCode: '药剂', topic: '万古霉素个体化剂量调整', decisionCount: 6, isFailure: false, createdAt: cur },
    { staffId: 's003', staffName: '王药师', deptCode: '药剂', topic: '华法林与抗生素相互作用漏审', decisionCount: 1, isFailure: true, createdAt: cur },
    { staffId: 's004', staffName: '赵医生', deptCode: '外一', topic: '腹腔镜胆囊切除术后早期进食', decisionCount: 5, isFailure: false, createdAt: cur },
    { staffId: 's005', staffName: '孙医生', deptCode: '儿科', topic: '小儿热性惊厥识别', decisionCount: 4, isFailure: false, createdAt: prev },
    { staffId: 's005', staffName: '孙医生', deptCode: '儿科', topic: '小儿补液速度过快', decisionCount: 1, isFailure: true, createdAt: prev },
  ];
}

/* ------------------------------------------------------------------ */
/* 路由                                                                */
/* ------------------------------------------------------------------ */

export const museMonthlyReportRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/muse/report/monthly',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      // 权限：仅 admin（依据宪法第七章 7.9 全院视角敏感性）
      const denied = requireRole(c, 'admin');
      if (denied) return denied;

      const parsed = parseYearMonth(c.query.get('year'), c.query.get('month'));
      if ('error' in parsed) {
        return json(fail(ErrorCode.BAD_REQUEST, parsed.error, c.traceId), 400);
      }

      try {
        const experiences = isDemo
          ? demoExperiences(parsed.year, parsed.month)
          : await loadAllExperiences();

        const report = generateMonthlyWisdomReport(parsed.year, parsed.month, experiences);
        const text = formatWisdomReport(report);
        return json(ok({ demo: isDemo, year: parsed.year, month: parsed.month, report, text }));
      } catch (err) {
        console.error(
          `[museMonthlyReport] GET /report/monthly [${c.traceId}] ${parsed.year}-${parsed.month}`,
          err,
        );
        return json(
          fail(
            ErrorCode.INTERNAL_ERROR,
            err instanceof Error ? err.message : '智慧资产月度报表加载失败',
            c.traceId,
          ),
          500,
        );
      }
    },
  },
];
