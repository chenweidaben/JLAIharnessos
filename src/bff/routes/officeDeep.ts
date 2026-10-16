/**
 * 健澜科技 jlmedaios — 【财务人力行政党建】医院行政办公深化路由（M178-C）
 *
 *   GET /api/v1/admin/office
 *     返回深度行政办公驾驶舱：
 *       1) buildDeepOfficeMgmt   — 公文/会议/档案/督办四域体系蓝图；
 *       2) routeApproval         — 演示一条公文在审批链上的当前待办人（不踢皮球）；
 *       3) scheduleMeeting       — 演示一个会议申请的预订/冲突/建议时段；
 *       4) trackSupervisionTask  — 演示三项督办任务的进度/风险/升级状态。
 *
 * 降级原则：DEMO_MODE 不连 PostgreSQL，返回内置演示样例并显式标记 demo=true；
 * 无数据域按空数组返回，不伪造数字。
 * 权限码：admin:office:view（院办 / 行政值班 / admin 只读）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';
import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildDeepOfficeMgmt,
  routeApproval,
  scheduleMeeting,
  trackSupervisionTask,
  type ApproverNode,
  type DocCategory,
  type DocDirection,
  type DocStatus,
  type MeetingRequest,
  type OfficeDocument,
  type RoomBooking,
  type SupervisionTask,
} from '../aggregators/officeDeepAggregator';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/* ----------------------------- 演示样例 ----------------------------- */

function demoDocument(): OfficeDocument {
  return {
    id: 'doc_2026_012',
    title: '关于印发《2026 年国庆节期间值班安排》的通知',
    direction: 'outgoing',
    category: 'notice',
    applicantId: 'u_yuanban',
    deptCode: 'yuanban',
    status: 'pending',
    currentStep: 1,
  };
}

function demoApprovers(): ApproverNode[] {
  return [
    { order: 0, role: 'dept_head', approverId: 'u_yuanban_head' },
    { order: 1, role: 'vice_director', approverId: 'u_vp_admin' },
    { order: 2, role: 'director', approverId: 'u_director' },
  ];
}

function demoMeeting(): MeetingRequest {
  return {
    id: 'mtg_2026_1016',
    title: '节前行政办公布置会',
    requesterDept: '院办',
    room: '行政楼301',
    startAt: '2026-09-28T09:00:00+08:00',
    endAt: '2026-09-28T10:00:00+08:00',
    attendees: 12,
  };
}

function demoBookings(): RoomBooking[] {
  return [
    { id: 'bk_1', room: '行政楼301', startAt: '2026-09-28T08:00:00+08:00', endAt: '2026-09-28T09:30:00+08:00', status: 'booked' },
  ];
}

function demoTasks(): SupervisionTask[] {
  const base = '2026-09-01T09:00:00+08:00';
  return [
    {
      id: 'sup_001', title: '国庆节前安全大检查整改', ownerDept: '后勤保卫处',
      assignedAt: base, dueAt: '2026-09-30T18:00:00+08:00',
      progress: 0.6, updates: [{ at: '2026-09-20T10:00:00+08:00', note: '消防器材已排查，食堂燃气待复查', progress: 0.6 }],
      closed: false,
    },
    {
      id: 'sup_002', title: '电子病历五级评审材料归档', ownerDept: '医务处',
      assignedAt: base, dueAt: '2026-09-15T18:00:00+08:00',
      progress: 0.4, updates: [{ at: '2026-09-12T10:00:00+08:00', note: '制度文件已齐，案例附件缺 3 份', progress: 0.4 }],
      closed: false,
    },
    {
      id: 'sup_003', title: '中秋职工福利发放', ownerDept: '工会',
      assignedAt: base, dueAt: '2026-09-20T18:00:00+08:00',
      progress: 1, updates: [{ at: '2026-09-19T17:00:00+08:00', note: '已全部发放签收', progress: 1 }],
      closed: true, closedAt: '2026-09-19T17:30:00+08:00',
    },
  ];
}

export const officeDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/office',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'admin:office:view');
      if (denied) return denied;

      // 演示模式：直接返回内置样例
      if (isDemo) {
        const now = new Date('2026-09-25T10:00:00+08:00');
        return json(ok({
          demo: true,
          system: buildDeepOfficeMgmt(),
          approval: routeApproval(demoDocument(), demoApprovers()),
          meeting: scheduleMeeting(demoMeeting(), demoBookings()),
          supervision: demoTasks().map((t) => trackSupervisionTask(t, now)),
          message: '演示模式：使用内置样例数据，未连接 PostgreSQL',
          generatedAt: new Date().toISOString(),
        }));
      }

      try {
        const db = getDb();
        // 真实模式：从库里拉待办公文、待排会议、开放督办任务；
        // 本路由为只读驾驶舱，写操作（提交公文/订会议/反馈进度）走既有 REST。
        const [pendingDocs, openMeetings, openTasks] = await Promise.all([
          db`SELECT id, title, direction, category, applicant_id, dept_code, status, current_step
              FROM clinical.oa_document WHERE status = 'pending' ORDER BY updated_at DESC LIMIT 20`,
          db`SELECT id, title, requester_dept, room, start_at, end_at, attendees
              FROM clinical.oa_meeting WHERE status IN ('booked','requested') ORDER BY start_at ASC LIMIT 50`,
          db`SELECT id, title, owner_dept, assigned_at, due_at, progress, updates, closed, closed_at
              FROM clinical.oa_supervision_task WHERE status <> 'closed' ORDER BY due_at ASC LIMIT 50`,
        ]);

        // 取第一条待办公文做流转演示（无待办公文时给空样例）
        const docRow = (pendingDocs as Array<Record<string, unknown>>)[0];
        const doc: OfficeDocument = docRow
          ? {
              id: String(docRow.id), title: String(docRow.title),
              direction: docRow.direction as DocDirection, category: docRow.category as DocCategory,
              applicantId: String(docRow.applicant_id ?? ''), deptCode: String(docRow.dept_code ?? ''),
              status: docRow.status as DocStatus, currentStep: Number(docRow.current_step ?? 0),
            }
          : demoDocument();
        const approval = routeApproval(doc, demoApprovers());

        // 会议预订样例：用第一条 open meeting 检测冲突
        const mtgRow = (openMeetings as Array<Record<string, unknown>>)[0];
        const meeting: MeetingRequest = mtgRow
          ? {
              id: String(mtgRow.id), title: String(mtgRow.title),
              requesterDept: String(mtgRow.requester_dept ?? ''), room: String(mtgRow.room),
              startAt: String(mtgRow.start_at), endAt: String(mtgRow.end_at),
              attendees: Number(mtgRow.attendees ?? 0),
            }
          : demoMeeting();
        const bookings: RoomBooking[] = (openMeetings as Array<Record<string, unknown>>)
          .filter((r) => String(r.id) !== meeting.id)
          .map((r) => ({
            id: String(r.id), room: String(r.room),
            startAt: String(r.start_at), endAt: String(r.end_at), status: 'booked',
          }));
        const meetingResult = scheduleMeeting(meeting, bookings);

        // 督办任务跟踪
        const supervision = (openTasks as Array<Record<string, unknown>>).map((r) =>
          trackSupervisionTask({
            id: String(r.id), title: String(r.title), ownerDept: String(r.owner_dept ?? ''),
            assignedAt: String(r.assigned_at), dueAt: String(r.due_at),
            progress: Number(r.progress ?? 0),
            updates: Array.isArray(r.updates) ? (r.updates as SupervisionTask['updates']) : [],
            closed: false,
          }),
        );

        return json(ok({
          demo: false,
          system: buildDeepOfficeMgmt(),
          approval,
          meeting: meetingResult,
          supervision,
          generatedAt: new Date().toISOString(),
        }));
      } catch (err) {
        console.error(`[officeDeep] GET /admin/office [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '行政办公数据加载失败', c.traceId),
          500,
        );
      }
    },
  },
];
