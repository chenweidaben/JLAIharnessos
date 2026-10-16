/**
 * 健澜科技 jlmedaios - 护士 Personal Agent 深化路由（M169-C）
 *
 * 知识图谱与Personal Agent：
 *   GET /api/v1/nurse/muse/:staffId —— 护士个人智能体主页：
 *     buildNurseMUSEProfile  个人知识图谱画像（四类经验沉淀统计 + 风险闭环 + 隐私画像）
 *     recommendNurseCare     按当前患者上下文召回的护理推荐（仅本人经验）
 *     trackNurseGrowth      周期成长跟踪（月度折线 + 里程碑 + 聚焦建议）
 *
 * 权限边界：
 *  - :staffId 传 'me' 或自身工号 → 看自己；
 *  - admin 可传他人工号查看（护士长带教 / 抽检复盘）；
 *  - 非 admin 查看他人 → 403 FORBIDDEN。
 *
 * 隐私红线：
 *  - 本切片无新表（待 nurse_experience 经验图谱表落地后，下方 demoCorpus
 *    原位替换为查询即可，纯函数签名不变）；
 *  - 推荐只召回本人经验节点，绝不混入他人护理经验；
 *  - 返回数据均为科室级聚合与经验摘要，不含患者直接标识。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildNurseMUSEProfile,
  recordNurseExperience,
  recommendNurseCare,
  trackNurseGrowth,
  type NurseExperience,
  type NurseExperienceDraft,
} from '../aggregators/nurseMuseAggregator';

/* ------------------------------------------------------------------ */
/* 权限解析                                                            */
/* ------------------------------------------------------------------ */

/**
 * resolveNurseMuseTarget：解析要查看的护士工号。
 * - 'me' 或缺省式别名 → 当前登录护士；
 * - 传他人工号且非 admin → forbidden。
 */
export function resolveNurseMuseTarget(
  user: { id: string; roles: string[] },
  paramStaffId: string,
): { staffId: string } | { forbidden: string } {
  const requested = (paramStaffId ?? '').trim();
  if (!requested || requested === 'me') return { staffId: user.id };
  if (requested !== user.id && !user.roles.includes('admin')) {
    return { forbidden: '权限不足：仅 admin 可查看他人护士个人智能体' };
  }
  return { staffId: requested };
}

/* ------------------------------------------------------------------ */
/* 本人经验语料（demo）                                                */
/* ------------------------------------------------------------------ */

/** 时间偏移工具：今天往前 offsetDays 天的 UTC ISO 串 */
function daysAgo(offsetDays: number, hh = 9): string {
  const d = new Date();
  d.setDate(d.getDate() - offsetDays);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}T${String(hh).padStart(2, '0')}:00:00.000Z`;
}

/**
 * demoCorpus：一名资深护士近半年沉淀的个人经验图谱样例。
 * 由 recordNurseExperience 真实塑形（可顺带验证落记脱敏逻辑），
 * 覆盖四类经验：风险 / 交班 / 技巧 / 满意度。
 */
function demoCorpus(staffId: string): NurseExperience[] {
  const drafts: NurseExperienceDraft[] = [
    // —— 护理风险沉淀 ——
    { subType: 'hazard', title: '夜尿频老年患者跌倒隐患', detail: '夜间起床频次高，床距卫生间远', dept: '老年医学科', riskLevel: 'high', tags: ['跌倒'], createdAt: daysAgo(60, 21) },
    { subType: 'prevention', title: '跌倒预防：留地灯+呼叫器置随手位', detail: '夜间留地灯，呼叫器固定床头伸手可及', dept: '老年医学科', riskLevel: 'high', outcome: 'success', tags: ['跌倒'], createdAt: daysAgo(55, 10) },
    { subType: 'hazard', title: '卧床患者压疮进展隐患', detail: '骶尾部皮肤发红，翻身依从性差', dept: '神经内科', riskLevel: 'medium', tags: ['压疮'], createdAt: daysAgo(40, 14) },
    { subType: 'prevention', title: '压疮预防：q2h翻身+减压垫+营养会诊', detail: '翻身班次表上墙，营养科介入蛋白摄入', dept: '神经内科', riskLevel: 'medium', outcome: 'success', tags: ['压疮'], createdAt: daysAgo(36, 9) },
    { subType: 'adverse_event', title: '抗凝患者穿刺点瘀斑观察不足', detail: '用药后 2h 巡视漏了一次，次日发现瘀斑', dept: '心内科', riskLevel: 'high', outcome: 'failure', tags: ['用药观察', '抗凝'], createdAt: daysAgo(25, 20) },
    // —— 交班经验沉淀 ——
    { subType: 'key_patient', title: '临终关怀患者需家属陪护排班', detail: '家属情绪波动大，夜班主动多巡一次', dept: '安宁疗护科', riskLevel: 'medium', tags: ['重点患者'], createdAt: daysAgo(48, 16) },
    { subType: 'precaution', title: '糖尿病患者餐前血糖交班必报', detail: '易被遗漏，交班本固定一栏「餐前血糖」', dept: '内分泌科', tags: ['交班'], createdAt: daysAgo(30, 8) },
    { subType: 'special_case', title: '听力障碍患者用写字板沟通', detail: '口头交班无效，改用纸笔确认', dept: '普外科', tags: ['沟通'], createdAt: daysAgo(18, 11) },
    // —— 护理技巧沉淀 ——
    { subType: 'operation', title: '深静脉导管双重固定手法', detail: '高举平台法 + 缝线二次固定，导管滑脱率下降', dept: '普外科', riskLevel: 'high', outcome: 'success', tags: ['管路护理'], createdAt: daysAgo(50, 15) },
    { subType: 'communication', title: '焦虑患者宣教用「示范+回授」', detail: '先示范一次，再让患者复述一遍', dept: '老年医学科', outcome: 'success', tags: ['沟通技巧'], createdAt: daysAgo(22, 10) },
    { subType: 'emergency', title: '输液反应应急：先停液再呼救', detail: '保留穿刺针，换空瓶，按铃后备肾上腺素', dept: '急诊科', riskLevel: 'high', outcome: 'success', tags: ['应急', '输液反应'], createdAt: daysAgo(12, 22) },
    // —— 患者满意度沉淀 ——
    { subType: 'praise', title: '患者表扬夜间巡视周到', detail: '家属书面表扬，已记录到满意度台账', tags: ['表扬'], createdAt: daysAgo(15, 17) },
    { subType: 'complaint', title: '呼叫响应等待偏长投诉', detail: '高峰时段呼叫积压，需优化响应优先级', tags: ['投诉'], createdAt: daysAgo(8, 9) },
    { subType: 'improvement', title: '投诉改进：高峰呼叫分级响应', detail: '紧急呼叫先派最近护士，普通呼叫打包巡房', outcome: 'success', tags: ['改进'], createdAt: daysAgo(3, 14) },
  ];
  return drafts.map((d) => recordNurseExperience(staffId, d));
}

/* ------------------------------------------------------------------ */
/* 路由                                                                */
/* ------------------------------------------------------------------ */

export const nurseMuseRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/nurse/muse/:staffId',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requireAuth(c);
      if (denied) return denied;

      const resolved = resolveNurseMuseTarget(c.user!, c.params.staffId ?? '');
      if ('forbidden' in resolved) {
        return json(fail(ErrorCode.FORBIDDEN, resolved.forbidden, c.traceId), 403);
      }
      const staffId = resolved.staffId;

      try {
        const experiences = demoCorpus(staffId);

        // 患者上下文可由查询参数带入：?dept=&riskLevel=&conditions=跌倒,压疮
        const patientContext = {
          dept: c.query.get('dept'),
          riskLevel: c.query.get('riskLevel'),
          conditions: c.query.get('conditions'),
        };

        const profile = buildNurseMUSEProfile(staffId, experiences);
        const recommendations = recommendNurseCare(staffId, patientContext, experiences);
        const growth = trackNurseGrowth(
          staffId,
          { start: c.query.get('start'), end: c.query.get('end') },
          experiences,
        );

        return json(
          ok({
            demo: true,
            staffId,
            privacyNotice: '仅聚合本人经验，不展示他人护理经验',
            profile,
            recommendations,
            growth,
          }),
        );
      } catch (err) {
        console.error(`[nurseMuse] GET /nurse/muse/:staffId [${c.traceId}] staff=${staffId}`, err);
        return json(
          fail(
            ErrorCode.INTERNAL_ERROR,
            err instanceof Error ? err.message : '护士个人智能体加载失败',
            c.traceId,
          ),
          500,
        );
      }
    },
  },
];
