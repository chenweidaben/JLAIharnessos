/**
 * 健澜科技 jlmedaios - M134-B 医生成长档案路由（周期快照表驱动）
 *
 * GET /api/v1/doctor/growth-profile —— 返回一名医生的成长档案：
 *   累计病例数 / 平均诊断准确率 / 经验沉淀条数 / 月度成长曲线 /
 *   技能标签演化 / 同科室医生对比 / 四维能力雷达。
 *
 * 【用户体验深化】让医生看到自己的进步、有成就感：
 *  - 只读端点，数据来源 medmuse.doctor_growth_record 月度快照；
 *  - 返回均为岗位级聚合，不含患者姓名 / 身份证号等直标身份；
 *  - doctorId 缺省时取当前登录医生；?doctorId=xxx 供带教 / 管理员查看他人；
 *  - DEMO_MODE=1 时走进程内样例数据，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';
import { requireAuth } from '../middleware/auth';
import {
  buildDoctorGrowthRecordProfile,
  type DoctorGrowthRecordRow,
  type PeerStat,
} from '../aggregators/doctorGrowthAggregator';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 无 DB 演示模式 */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** doctor_growth_record 一行的宽松读取 */
interface GrowthRow {
  period: unknown;
  cases_handled: unknown;
  avg_score: unknown;
  experience_count: unknown;
  skills: unknown;
}

/** 同科室聚合一行 */
interface PeerRow {
  doctor_id: unknown;
  cases_handled: unknown;
  avg_score: unknown;
  experience_count: unknown;
}

/** 从 DB 拉取该医生的月度成长快照 */
async function loadRecords(doctorId: string, hospitalId: string): Promise<DoctorGrowthRecordRow[]> {
  const db = getDb();
  const rows = (await db`
    SELECT period, cases_handled, avg_score, experience_count, skills
    FROM medmuse.doctor_growth_record
    WHERE doctor_id = ${doctorId} AND hospital_id = ${hospitalId}
    ORDER BY period ASC
    LIMIT 120
  `) as GrowthRow[];

  return rows.map((r) => ({
    period: typeof r.period === 'string' ? r.period : '',
    casesHandled: Number(r.cases_handled ?? 0),
    avgScore: Number(r.avg_score ?? 0),
    experienceCount: Number(r.experience_count ?? 0),
    skills: Array.isArray(r.skills) ? r.skills.map((s) => String(s)) : [],
  }));
}

/** 从 DB 拉取同科室（同医院）其他医生的聚合统计 */
async function loadPeers(doctorId: string, hospitalId: string): Promise<PeerStat[]> {
  const db = getDb();
  const rows = (await db`
    SELECT doctor_id,
           SUM(cases_handled)::int              AS cases_handled,
           CASE WHEN SUM(cases_handled) > 0
                THEN ROUND((SUM(avg_score * cases_handled) / SUM(cases_handled))::numeric, 2)
                ELSE 0 END                       AS avg_score,
           SUM(experience_count)::int           AS experience_count
    FROM medmuse.doctor_growth_record
    WHERE hospital_id = ${hospitalId} AND doctor_id <> ${doctorId}
    GROUP BY doctor_id
    ORDER BY avg_score DESC
    LIMIT 50
  `) as PeerRow[];

  return rows.map((r) => ({
    doctorId: typeof r.doctor_id === 'string' ? r.doctor_id : '',
    casesHandled: Number(r.cases_handled ?? 0),
    avgScore: Number(r.avg_score ?? 0),
    experienceCount: Number(r.experience_count ?? 0),
  }));
}

/** 演示样例：一名医生近 6 个月逐步成长、技能标签增多 */
function demoRecords(): DoctorGrowthRecordRow[] {
  return [
    { period: '2026-05', casesHandled: 42, avgScore: 82.5, experienceCount: 3, skills: ['胸痛分诊', '心电图判读'] },
    { period: '2026-06', casesHandled: 55, avgScore: 84.0, experienceCount: 5, skills: ['胸痛分诊', '心电图判读', '抗凝评估'] },
    { period: '2026-07', casesHandled: 61, avgScore: 86.2, experienceCount: 4, skills: ['胸痛分诊', '抗凝评估', '医患沟通'] },
    { period: '2026-08', casesHandled: 70, avgScore: 88.0, experienceCount: 7, skills: ['抗凝评估', '医患沟通', '路径管理'] },
    { period: '2026-09', casesHandled: 78, avgScore: 90.4, experienceCount: 6, skills: ['抗凝评估', '医患沟通', '路径管理', '医保病组'] },
    { period: '2026-10', casesHandled: 83, avgScore: 91.8, experienceCount: 8, skills: ['抗凝评估', '路径管理', '医保病组', '重症识别'] },
  ];
}

/** 演示样例：同科室 4 名医生 */
function demoPeers(): PeerStat[] {
  return [
    { doctorId: 'D002', casesHandled: 260, avgScore: 88.5, experienceCount: 22 },
    { doctorId: 'D003', casesHandled: 210, avgScore: 84.0, experienceCount: 15 },
    { doctorId: 'D004', casesHandled: 300, avgScore: 92.0, experienceCount: 30 },
    { doctorId: 'D005', casesHandled: 180, avgScore: 79.5, experienceCount: 10 },
  ];
}

export const doctorGrowthRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/doctor/growth-profile',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAuth(c);
      if (denied) return denied;

      // ?doctorId=xxx 缺省时取当前登录医生
      const doctorId = (c.query.get('doctorId') ?? c.user?.id ?? '').trim();
      if (!doctorId) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少医生工号 doctorId', c.traceId), 400);
      }
      // 医院隔离键：当前用户所属医院；缺省兜底 demo-hospital（与 261 迁移默认值一致）
      const hospitalId = 'demo-hospital';

      try {
        const records: DoctorGrowthRecordRow[] = isDemo ? demoRecords() : await loadRecords(doctorId, hospitalId);
        const peers: PeerStat[] = isDemo ? demoPeers() : await loadPeers(doctorId, hospitalId);
        const profile = buildDoctorGrowthRecordProfile(doctorId, records, peers);
        return json(
          ok(
            {
              demo: isDemo,
              ...profile,
            },
            '医生成长档案已加载',
            c.traceId,
          ),
        );
      } catch (err) {
        console.error(`[doctorGrowth] GET /growth-profile [${c.traceId}]`, err);
        return json(
          fail(
            ErrorCode.INTERNAL_ERROR,
            err instanceof Error ? err.message : '医生成长档案加载失败',
            c.traceId,
          ),
          500,
        );
      }
    },
  },
];
