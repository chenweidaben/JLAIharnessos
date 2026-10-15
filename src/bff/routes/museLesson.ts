/**
 * 健澜科技 jlmedaios - M115-B 经验/教训主动录入路由
 *
 * POST /api/v1/muse/lesson：员工手工录入一次「场景 → 决策 → 结果 → 教训」，
 *   写入 medmuse.staff_decision_memory，context.source 固定为 'manual'，
 *   与 Agent 自动捕获（source='agent'）的决策记忆并存、同库召回。
 *
 * 依据宪法第七章（全角色 Personal Agent）：
 *   - 只能录入「本人」的决策记忆，staff_id 取当前登录用户，前端无法伪造他人；
 *   - context jsonb 只存场景摘要与标签，严禁落患者姓名 / 身份证号等直接标识符；
 *   - outcome 仅用于个人学习闭环，不参与绩效。
 *
 * 医疗安全：
 *   - 全部入参先过纯函数 validateLessonInput 收敛，非法一律 400 + 字段级 errors；
 *   - DEMO_MODE=1 时走进程内内存兜底，不连 PostgreSQL、不抛错。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '@/db/pool.js';
import {
  parseTags,
  validateLessonInput,
  type LessonInput,
  type LessonOutcome,
} from '../aggregators/lessonRecordAggregator';
import type { StaffMuseRole } from '../aggregators/staffMuseAggregator';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 无 DB 演示模式：走进程内内存兜底，不连 PostgreSQL */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/**
 * deriveStaffRole：从登录用户角色列表推导 staff_decision_memory.role。
 * 库表 CHECK 仅允许 doctor / nurse / pharma / admin 四类；匹配不到时兜底 'admin'。
 */
function deriveStaffRole(roles: string[] | undefined): StaffMuseRole {
  const hay = (roles ?? []).join(' ').toLowerCase();
  if (/(^|[^a-z])(doctor|physician)([^a-z]|$)/.test(hay) || hay.includes('医生')) return 'doctor';
  if (/(^|[^a-z])nurse([^a-z]|$)/.test(hay) || hay.includes('护士')) return 'nurse';
  if (/(^|[^a-z])pharma(cy|cist)?([^a-z]|$)/.test(hay) || hay.includes('药师')) return 'pharma';
  return 'admin';
}

/** DEMO 模式内存台账：仅用于无 DB 演示，数据不持久化 */
interface DemoLessonRow {
  id: string;
  staffId: string;
  role: string;
  scenario: string;
  decision: string;
  outcome: string;
  lesson: string | null;
  tags: string[];
  createdAt: string;
}
const demoLessons: DemoLessonRow[] = [];

function newDemoId(): string {
  return `demo_lesson_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export const museLessonRoutes: RouteDef[] = [
  // ----- 经验/教训主动录入 -----
  {
    method: 'POST',
    path: '/api/v1/muse/lesson',
    auth: true,
    handle: async (c) => {
      if (!c.user) {
        return json(fail(ErrorCode.UNAUTHORIZED, '未登录或登录已过期', c.traceId), 401);
      }

      const body = await c.body<LessonInput | null>();
      const { valid, errors } = validateLessonInput(body ?? {});
      if (!valid) {
        // 400 + 字段级错误明细，前端据此逐字段红标
        return json(
          {
            code: ErrorCode.BAD_REQUEST,
            message: '录入内容校验未通过',
            data: { errors },
            timestamp: new Date().toISOString(),
            traceId: c.traceId,
          },
          400,
        );
      }

      // 纯函数已校验通过，此处可安全收敛类型
      const scenario = String(body?.scenario ?? '').trim();
      const decision = String(body?.decision ?? '').trim();
      const outcome = String(body?.outcome ?? '').trim() as LessonOutcome;
      const lessonRaw = String(body?.lesson ?? '').trim();
      const lesson = lessonRaw.length > 0 ? lessonRaw : null;
      const tags = parseTags(body?.tags);
      const staffId = c.user.id;
      const role = deriveStaffRole(c.user.roles);

      // DEMO：不连 PG，写入内存台账
      if (isDemo) {
        const row: DemoLessonRow = {
          id: newDemoId(),
          staffId,
          role,
          scenario,
          decision,
          outcome,
          lesson,
          tags,
          createdAt: new Date().toISOString(),
        };
        demoLessons.push(row);
        return json(
          ok(
            {
              id: row.id,
              persisted: false,
              source: 'manual',
              tags,
              createdAt: row.createdAt,
            },
            '经验/教训已录入（演示模式，未持久化）',
            c.traceId,
          ),
        );
      }

      try {
        // 依据宪法第七章：context jsonb 只存场景摘要 / 标签 / 来源，不落患者直接标识符
        const context = {
          source: 'manual',
          scenario,
          tags,
          recordedByName: c.user.name ?? null,
        };
        const rows = await getDb()<Record<string, unknown>[]>`
          INSERT INTO medmuse.staff_decision_memory
            (staff_id, role, context, decision, outcome, lesson)
          VALUES (
            ${staffId},
            ${role},
            ${getDb().json(context)},
            ${decision},
            ${outcome},
            ${lesson}
          )
          RETURNING id, created_at`;
        const row = rows[0];
        return json(
          ok(
            {
              id: String(row?.id ?? ''),
              persisted: true,
              source: 'manual',
              tags,
              createdAt: String(row?.created_at ?? ''),
            },
            '经验/教训已录入',
            c.traceId,
          ),
        );
      } catch (err) {
        console.error(`[museLesson error] ${c.req.method} ${c.req.url} [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, '服务器内部错误，请联系管理员', c.traceId),
          500,
        );
      }
    },
  },
];
