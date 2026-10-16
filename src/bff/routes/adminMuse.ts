/**
 * 健澜科技 jlmedaios - 管理员个人管理智能体路由（M169-D）
 *
 * 知识图谱与 Personal Agent：
 *   GET /api/v1/admin/muse/:staffId —— 返回某管理员的个人 MUSE 智能体画像：
 *     四类沉淀分布 / 成长分 / 擅长打法 / 待补强盲区 / 栽过的跟头 / 危机稳健度。
 *
 * 权限边界（依据第七章个人数据归属）：
 *  - 仅 admin 角色可访问（院长 / 职能科室主任）；
 *  - 普通员工访问 → 403 FORBIDDEN；
 *  - :staffId 为路径参数，admin 可查看任意管理员（院长带教 / 管理复盘抽检）。
 *
 * 医疗安全：本端点纯只读画像；经验语料为脱敏管理摘要，不含患者直接标识符。
 *   本切片无新表、不写 SQL，经验沉淀在进程内个人经验图谱。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildAdminMUSEProfile,
  recordAdminExperience,
  type AdminExperienceInput,
} from '../aggregators/adminMuseAggregator';

/* ------------------------------------------------------------------ */
/* 冷启动演示语料（仅当该员工在图谱中尚无任何沉淀时播种一次）            */
/* ------------------------------------------------------------------ */

/**
 * seedDemoCorpus：给一名新管理员播种一组「有胜有负、四类齐全」的真实感经验，
 *   让画像首屏即有内容，而非空壳。仅在图谱为空时调用一次（幂等由 build 侧判断）。
 */
function seedDemoCorpus(staffId: string): void {
  const demos: AdminExperienceInput[] = [
    // 运营决策沉淀（决策/结果/反思）
    { category: 'operations_decision', subType: '门诊运营', situation: '周一上午门诊高峰拥堵，候诊超 60 分钟', action: '推行分时段预约 + 诊间结算，号源按 15 分钟切分', outcome: 'success', effectiveness: 1.5, reflection: '先放号源后调动线，患者感知最明显；复诊号源优先给老年现场窗口。', tags: ['门诊', '预约', '拥堵'] },
    { category: 'operations_decision', subType: '绩效考核', situation: '平均住院日偏高，科室推高床日', action: '把 DRG 效率指标纳入科室绩效系数，按月公示', outcome: 'mixed', effectiveness: 0.5, reflection: '骨科配合度高，内科抵触强；需配套科主任一对一沟通。', tags: ['绩效', 'DRG', '平均住院日'] },
    { category: 'operations_decision', subType: '设备采购', situation: '检验科报告周期长，临床抱怨', action: '一次性采购全自动流水线生化设备', outcome: 'failure', effectiveness: -1.2, reflection: '只买设备没改造 LIS 流程，瓶颈在数据流转不在检测速度；下次先做流程测绘。', tags: ['采购', '检验', '流程'] },
    // 管理经验沉淀（流程优化/团队管理/问题解决）
    { category: 'management', subType: '流程优化', situation: '入院办理排长队，医保审核反复退单', action: '上线入院预审并行窗口，医保前置稽核', outcome: 'success', effectiveness: 1.3, reflection: '把医保稽核从窗口后移到入院前，退单率从 18% 降到 6%。', tags: ['流程', '入院', '医保'] },
    { category: 'management', subType: '团队管理', situation: '夜班护士离职率偏高', action: '调整夜班补贴 + 弹性排班 + 半年一次职业访谈', outcome: 'success', effectiveness: 1.0, reflection: '钱只是一半，护士更在意被看见；职业访谈留人效果超预期。', tags: ['护士', '排班', '离职'] },
    { category: 'management', subType: '问题解决', situation: '临床对信息科工单响应慢', action: '建立一线驻场 + 5 分钟响应 SLA，周报复盘高频工单', outcome: 'mixed', effectiveness: 0.6, reflection: '驻场解决了响应，但根因重复出现，需从系统侧而非人肉兜底。', tags: ['信息科', '工单', 'SLA'] },
    // 资源调配沉淀（调配方案/效果/改进）
    { category: 'resource_allocation', subType: '床位调配', situation: 'ICU 床位紧张，普通病区空床闲置', action: '按实际负荷跨病区调拨 6 张重症床位，建立日清床位调度会', outcome: 'success', effectiveness: 1.2, reflection: '日清会比月度床位会管用；关键是给调拨科室算清补偿账。', tags: ['床位', 'ICU', '调度'] },
    { category: 'resource_allocation', subType: '人力调配', situation: '流感季门诊人力吃紧', action: '从行政与医技科室抽调备班支援导诊与预检', outcome: 'mixed', effectiveness: 0.4, reflection: '备班没培训就上，反而增加答疑成本；下次提前两周做半小时上岗培训。', tags: ['人力', '流感', '备班'] },
    // 危机处理沉淀（事件/应对/教训）
    { category: 'crisis', subType: '舆情应对', situation: '一条挂号难的短视频本地发酵', action: '2 小时内官方说明 + 次日增开晚门诊，院领导当面回应', outcome: 'success', effectiveness: 1.1, reflection: '危机处置速度比措辞完美更重要；先认账再改，比辩解有效。', tags: ['舆情', '短视频', '门诊'] },
    { category: 'crisis', subType: '信息安全', situation: 'HIS 一次计划性升级导致 40 分钟停机', action: '事后 24 小时内出时间线复盘，升级改为灰度 + 回滚预案', outcome: 'mixed', effectiveness: -0.3, reflection: '教训：升级窗口必须选在业务低谷并预留回滚，不能赌一次成功。', tags: ['HIS', '升级', '停机'] },
  ];
  for (const d of demos) recordAdminExperience(staffId, d);
}

/* ------------------------------------------------------------------ */
/* 路由                                                                */
/* ------------------------------------------------------------------ */

export const adminMuseRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/muse/:staffId',
    auth: true,
    handle: (c: Ctx): Response => {
      const denied = requireAuth(c);
      if (denied) return denied;

      // 权限：仅 admin 可访问个人管理智能体
      const roles: string[] = c.user?.roles ?? [];
      if (!roles.includes('admin')) {
        return json(
          fail(ErrorCode.FORBIDDEN, '权限不足：仅管理员可访问个人管理智能体', c.traceId),
          403,
        );
      }

      const staffId = (c.params.staffId ?? '').trim();
      if (!staffId) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少 staffId', c.traceId), 400);
      }

      // 纯函数构建画像；空图谱先播种一次演示语料，让首屏可用
      let profile = buildAdminMUSEProfile(staffId);
      if (profile.isColdStart) {
        seedDemoCorpus(staffId);
        profile = buildAdminMUSEProfile(staffId);
      }

      return json(
        ok(
          {
            ...profile,
            staffId,
            seeded: profile.totalExperiences > 0,
          },
          'ok',
          c.traceId,
        ),
      );
    },
  },
];
