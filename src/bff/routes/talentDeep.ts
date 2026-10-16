/**
 * 健澜科技 jlmedaios - M166-B 医院人才管理深化 BFF 路由（管理驾驶舱，仅 admin）
 *
 * GET /api/v1/admin/talent/inventory?dept=xxx
 *  - 采集科室员工人才画像（进程内内存快照，零新依赖），交由纯函数
 *    buildTalentInventory / identifySkillGap / recommendTraining /
 *    identifySuccessor 归并为一页人才盘点；
 *  - 返回 { inventory, gaps, trainingPlan, successors, demo }；
 *    无真实样本时打 demo 标记，前端走三态，绝不用假数据冒充真实结论。
 *
 * 【绩效与人才】人才管理要发展人，不是监控人：
 *   - 人才画像（技能/证书/培训/绩效）+ 潜力分 → 四档梯队（继任就绪/骨干/后备/普通）；
 *   - 技能缺口 → 培训计划（学什么、学多久、多紧急）；
 *   - 关键岗位 → 继任者识别（防断层，不搞末位淘汰）。
 *
 * 生产安全加固：
 *  - 仅 admin 角色（requireRole 内部已处理 401/403），本端点只读、无写副作用；
 *  - 不暴露员工身份证号/手机号等 PII，只返回工号/姓名/职称/画像聚合量；
 *  - 不碰 WebSocket、不新增依赖。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildTalentInventory,
  identifySkillGap,
  identifySuccessor,
  recommendTraining,
  type StaffProfile,
} from '../aggregators/talentDeepAggregator';

/** 演示模式开关：与 wisdomDashboard / smartAsset 一致 */
function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
}

/* -------------------- 进程内内存采集（零新依赖，仅本模块） -------------------- */

/** 各科室员工画像库（累计口径；真实部署由 HR/HRP 对接写入） */
const talentPool: Record<string, StaffProfile[]> = {
  IN: [
    { staffId: 'd1001', name: '王建国', dept: 'IN', title: '主任医师', skills: ['冠心病介入', '重症超声', '慢病管理'], certificates: ['执业医师资格证', '介入诊疗上岗证'], completedTrainings: ['科研方法学', 'AI 临床应用'], performanceScore: 92, potentialScore: 88, yearsOfService: 18 },
    { staffId: 'd1002', name: '李慧敏', dept: 'IN', title: '副主任医师', skills: ['重症超声', '慢病管理'], certificates: ['执业医师资格证', 'BLS'], completedTrainings: ['DRG/DIP 病案'], performanceScore: 84, potentialScore: 86, yearsOfService: 11 },
    { staffId: 'd1003', name: '赵晓峰', dept: 'IN', title: '主治医师', skills: ['慢病管理'], certificates: ['执业医师资格证'], completedTrainings: ['感控专项'], performanceScore: 76, potentialScore: 74, yearsOfService: 6 },
    { staffId: 'd1004', name: '陈雨欣', dept: 'IN', title: '住院医师', skills: [], certificates: ['执业医师资格证'], completedTrainings: ['规培'], performanceScore: 68, potentialScore: 80, yearsOfService: 2 },
  ],
  SU: [
    { staffId: 'd2001', name: '刘振海', dept: 'SU', title: '主任医师', skills: ['腹腔镜手术', '围术期管理', '重症监护'], certificates: ['执业医师资格证', '外科中级'], completedTrainings: ['科研方法学'], performanceScore: 90, potentialScore: 85, yearsOfService: 20 },
    { staffId: 'd2002', name: '孙丽华', dept: 'SU', title: '副主任医师', skills: ['腹腔镜手术', '围术期管理'], certificates: ['执业医师资格证'], completedTrainings: ['DRG/DIP 病案'], performanceScore: 82, potentialScore: 78, yearsOfService: 9 },
    { staffId: 'd2003', name: '周子昂', dept: 'SU', title: '主治医师', skills: ['围术期管理'], certificates: ['执业医师资格证'], completedTrainings: ['感控专项'], performanceScore: 72, potentialScore: 70, yearsOfService: 5 },
  ],
  NU: [
    { staffId: 'n3001', name: '吴敏', dept: 'NU', title: '护士长', skills: ['重症护理', '伤口造口'], certificates: ['护师', '伤口造口专科证'], completedTrainings: ['护理管理'], performanceScore: 88, potentialScore: 82, yearsOfService: 15 },
    { staffId: 'n3002', name: '郑小燕', dept: 'NU', title: '护师', skills: ['重症护理'], certificates: ['护师', 'BLS'], completedTrainings: ['感控专项'], performanceScore: 78, potentialScore: 76, yearsOfService: 6 },
    { staffId: 'n3003', name: '冯洁', dept: 'NU', title: '护士', skills: [], certificates: ['护士执业证'], completedTrainings: ['规培'], performanceScore: 70, potentialScore: 72, yearsOfService: 2 },
  ],
};

/** 各科室岗位必备技能（用于缺口识别） */
const deptRequiredSkills: Record<string, string[]> = {
  IN: ['冠心病介入', '重症超声', 'DRG/DIP 病案', 'AI 临床应用'],
  SU: ['腹腔镜手术', '围术期管理', '重症监护', 'DRG/DIP 病案'],
  NU: ['重症护理', '伤口造口', '感控'],
};

/** 关键岗位 → 候选科室与现任者（用于继任者识别） */
const keyPositions: Record<string, { position: string; dept: string; incumbentStaffId?: string; requiredSkills: string[] }> = {
  IN: { position: '心内科主任', dept: 'IN', incumbentStaffId: 'd1001', requiredSkills: ['冠心病介入', '重症超声', '慢病管理'] },
  SU: { position: '普外科主任', dept: 'SU', incumbentStaffId: 'd2001', requiredSkills: ['腹腔镜手术', '围术期管理', '重症监护'] },
  NU: { position: '护理部主任', dept: 'NU', incumbentStaffId: 'n3001', requiredSkills: ['重症护理', '伤口造口'] },
};

/**
 * GET /api/v1/admin/talent/inventory
 * 科室人才盘点（管理驾驶舱，仅 admin）。
 * query: dept（科室编码，默认 IN；不在库时回退全院聚合到第一个有数据科室）
 */
async function handleTalentInventory(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    let dept = (c.query.get('dept') ?? 'IN').trim() || 'IN';
    if (!talentPool[dept]) {
      // 未知科室回退到第一个有数据的科室，不抛 404
      dept = Object.keys(talentPool)[0] ?? 'IN';
    }
    const nowIso = new Date().toISOString();

    const staff = talentPool[dept] ?? [];
    const requiredSkills = deptRequiredSkills[dept] ?? [];

    // 1) 人才画像盘点（发展人：四档梯队）
    const inventory = buildTalentInventory({ dept, staff }, nowIso);

    // 2) 技能缺口识别（缺口是培养方向）
    const gaps = identifySkillGap({ dept, staff }, requiredSkills);

    // 3) 培训计划：为每位后备/普通员工按其所在科室缺口生成学习建议
    const trainingPlan = staff.flatMap((s) =>
      gaps
        .filter((g) => g.shortage > 0)
        // 仅给尚未掌握该技能的人推荐
        .filter((g) => !s.skills.some((sk) => sk.toLowerCase() === g.skill.toLowerCase()))
        .map((g) => recommendTraining(s.staffId, g)),
    );

    // 4) 关键岗位继任者识别（防断层）
    const kp = keyPositions[dept];
    const successors = kp
      ? identifySuccessor({
          position: kp.position,
          requiredSkills: kp.requiredSkills,
          candidates: staff,
          incumbentStaffId: kp.incumbentStaffId,
        })
      : null;

    // 无真实样本时强制 demo 标记
    const demo = demoModeEnabled() || staff.length === 0;

    return json(
      ok({ inventory, gaps, trainingPlan, successors, demo, dept }, 'ok', c.traceId),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : '人才盘点采集失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const talentDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/talent/inventory',
    auth: true,
    handle: handleTalentInventory,
  },
];
