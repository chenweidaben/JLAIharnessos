/**
 * 健澜科技 jlmedaios - M460 临床教学与住培管理深化（teaching）
 *
 * 住培轮转计划 / 带教老师 / 学员考核 / 教学查房 / 技能竞赛 / 教学课程
 * 避开 M443 teaching/schedules、teaching/residency、teaching/continuing-edu 与 M458 继教学分。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/teaching/rotations - 住培轮转计划（学员/科室/起止/带教/阶段考核）5 条 */
async function handleTeachRotations(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ROT-001', trainee: '学员：住培学员 林***（内科基地第 2 年）', dept: '科室：心内科（8 周轮转）', period: '起止：2026-09-01 至 2026-10-27', preceptor: '带教：心内科 王*** 主任医师', exam: '阶段考核：出科考核 2026-10-25（待进行，笔试+OSCE）' },
    { id: 'ROT-002', trainee: '学员：住培学员 陈***（外科基地第 1 年）', dept: '科室：普外科（12 周轮转）', period: '起止：2026-09-14 至 2026-12-06', preceptor: '带教：普外科 刘*** 副主任医师', exam: '阶段考核：入科教育已完成，出科考核计划 12 月初' },
    { id: 'ROT-003', trainee: '学员：住培学员 黄***（全科基地第 3 年）', dept: '科室：急诊科（6 周轮转）', period: '起止：2026-10-06 至 2026-11-17', preceptor: '带教：急诊科 周*** 主治医师', exam: '阶段考核：中期评鉴进行中（急诊接诊能力评估）' },
    { id: 'ROT-004', trainee: '学员：住培学员 赵***（内科基地第 3 年）', dept: '科室：呼吸与危重症科（8 周轮转）', period: '起止：2026-08-03 至 2026-09-28', preceptor: '带教：呼吸科 孙*** 主任医师', exam: '阶段考核：已出科（考核 92 分，优良）' },
    { id: 'ROT-005', trainee: '学员：住培学员 吴***（儿科基地第 2 年）', dept: '科室：新生儿科（8 周轮转）', period: '起止：2026-10-13 至 2026-12-08', preceptor: '带教：新生儿科 郑*** 副主任医师', exam: '阶段考核：入科阶段（待中期评鉴）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/teaching/preceptors - 带教老师（教师/科室/职称/带教年限/评价分）5 条 */
async function handleTeachPreceptors(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PRE-001', teacher: '教师：王***（心内科主任医师）', dept: '科室：心内科', title: '职称：主任医师 / 教学主任', years: '带教年限：12 年（连续带教住培）', score: '评价分：4.9/5.0（学员匿名评分 46 人次）' },
    { id: 'PRE-002', teacher: '教师：刘***（普外科副主任医师）', dept: '科室：普外科', title: '职称：副主任医师 / 外科基地带教组长', years: '带教年限：8 年', score: '评价分：4.8/5.0（42 人次）' },
    { id: 'PRE-003', teacher: '教师：周***（急诊科主治医师）', dept: '科室：急诊科', title: '职称：主治医师 / 急诊带教', years: '带教年限：5 年', score: '评价分：4.7/5.0（38 人次）' },
    { id: 'PRE-004', teacher: '教师：孙***（呼吸科主任医师）', dept: '科室：呼吸与危重症科', title: '职称：主任医师 / 内科基地主任', years: '带教年限：15 年', score: '评价分：4.95/5.0（60 人次，基地优秀带教）' },
    { id: 'PRE-005', teacher: '教师：郑***（新生儿科副主任医师）', dept: '科室：新生儿科', title: '职称：副主任医师 / 儿科带教', years: '带教年限：7 年', score: '评价分：4.8/5.0（31 人次）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/teaching/assessments - 学员考核（学员/科目/成绩/等级/考核人）5 条 */
async function handleTeachAssessments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ASM-001', trainee: '学员：林***（住培 2 年级）', subject: '科目：心内科出科考核（理论+病例分析）', score: '成绩：92 分（理论 88 + OSCE 96）', grade: '等级：优良（≥90）', examiner: '考核人：心内科教学组（王*** 主考）' },
    { id: 'ASM-002', trainee: '学员：陈***（住培 1 年级）', subject: '科目：外科入科基本操作考核（缝合/打结）', score: '成绩：78 分（操作熟练程度待加强）', grade: '等级：合格（60–79）', examiner: '考核人：普外科 刘***（操作考官）' },
    { id: 'ASM-003', trainee: '学员：赵***（住培 3 年级）', subject: '科目：呼吸科出科 OSCE（接诊+鉴别诊断）', score: '成绩：95 分', grade: '等级：优秀（≥90）', examiner: '考核人：呼吸科教学组（孙*** 主考）' },
    { id: 'ASM-004', trainee: '学员：黄***（住培 3 年级）', subject: '科目：急诊中期评鉴（病例处置 + 急救流程）', score: '成绩：84 分', grade: '等级：良好（80–89）', examiner: '考核人：急诊科 周***（标准化病人配合）' },
    { id: 'ASM-005', trainee: '学员：吴***（住培 2 年级）', subject: '科目：新生儿科入科笔试（新生儿黄疸鉴别）', score: '成绩：66 分（需补考，未达出科线）', grade: '等级：待补考（<60 需补考，60–79 合格但需辅导）', examiner: '考核人：新生儿科 郑***' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/teaching/rounds - 教学查房（查房日期/主讲/科室/参与人数/记录）5 条 */
async function handleTeachRounds(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RND-001', date: '查房日期：2026-10-17 09:00–10:30', lead: '主讲：王*** 主任医师（心内科）', dept: '科室：心内科病房', attendees: '参与人数：12 人（主治 2 + 住培 6 + 实习 4）', record: '记录：围绕 1 例急性心衰病例，讲解评估与用药，教学记录已归档' },
    { id: 'RND-002', date: '查房日期：2026-10-15 14:30–16:00', lead: '主讲：刘*** 副主任医师（普外科）', dept: '科室：普外科病房', attendees: '参与人数：10 人', record: '记录：1 例胆囊切除术围术期教学，讨论切口管理与并发症预防' },
    { id: 'RND-003', date: '查房日期：2026-10-12 08:30–10:00', lead: '主讲：孙*** 主任医师（呼吸科）', dept: '科室：呼吸科病房', attendees: '参与人数：14 人（含外院进修生 2）', record: '记录：1 例 AECOPD 病例，重点讲解血气判读与分级治疗' },
    { id: 'RND-004', date: '查房日期：2026-10-09 15:00–16:30', lead: '主讲：周*** 主治医师（急诊科）', dept: '科室：急诊抢救室', attendees: '参与人数：8 人', record: '记录：急诊留观病例教学，急救流程与分诊思维训练' },
    { id: 'RND-005', date: '查房日期：2026-10-20 10:00–11:30（计划）', lead: '主讲：郑*** 副主任医师（新生儿科）', dept: '科室：新生儿科 NICU', attendees: '参与人数：预计 9 人', record: '记录：待开展（早产儿喂养病例，教学计划已排期）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/teaching/competitions - 技能竞赛（竞赛名/科室/选手/奖项/日期）5 条 */
async function handleTeachCompetitions(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CMP-001', name: '竞赛名：2026 院级青年医师临床技能大赛', dept: '科室：心内科（选送）', player: '选手：住培学员 林***', award: '奖项：一等奖（综合技能组）', date: '日期：2026-09-26' },
    { id: 'CMP-002', name: '竞赛名：2026 院级青年医师临床技能大赛', dept: '科室：普外科（选送）', player: '选手：住培学员 陈***', award: '奖项：三等奖（外科操作组）', date: '日期：2026-09-26' },
    { id: 'CMP-003', name: '竞赛名：全市住院医师规范化培训临床技能竞赛', dept: '科室：急诊科（选送，院队）', player: '选手：黄*** + 2 名队友（团队赛）', award: '奖项：团体二等奖（市级）', date: '日期：2026-08-18' },
    { id: 'CMP-004', name: '竞赛名：护理技能操作比武（静脉留置针/心肺复苏）', dept: '科室：ICU（选送，护理线）', player: '选手：护士 徐***', award: '奖项：一等奖（单人 CPR 组）', date: '日期：2026-10-10' },
    { id: 'CMP-005', name: '竞赛名：青年教师教学查房比赛（院内）', dept: '科室：呼吸科（选送）', player: '选手：带教 孙***（教师组）', award: '奖项：一等奖（最佳教学查房）', date: '日期：2026-07-30' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/teaching/curriculum - 教学课程（课程名/学时/对象/教材/进度）5 条 */
async function handleTeachCurriculum(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CUR-001', course: '课程名：内科常见病诊疗思路（住培系列课）', hours: '学时：32 学时（每周 2 学时，16 周）', audience: '对象：内科基地全体住培学员', textbook: '教材：《内科学》第 9 版 + 本院病例库', progress: '进度：第 8/16 周（已完成 16/32 学时）' },
    { id: 'CUR-002', course: '课程名：外科基本操作与无菌技术（入门课）', hours: '学时：16 学时（集中实操，4 天）', audience: '对象：外科基地 1 年级住培 + 实习生', textbook: '教材：《外科学》第 9 版 + 操作视频库', progress: '进度：已完成（9 月开班，考核闭环）' },
    { id: 'CUR-003', course: '课程名：急诊急救（BLS/ACLS 基础）课程', hours: '学时：20 学时（理论 8 + 模拟 12）', audience: '对象：全体住培学员（必修）', textbook: '教材：AHA BLS/ACLS 教材 + 模拟中心设备', progress: '进度：第 2 期开班中（完成 12/20 学时）' },
    { id: 'CUR-004', course: '课程名：医学沟通与医患关系（人文课）', hours: '学时：8 学时（4 次讲座）', audience: '对象：全体住培 + 新入职医师', textbook: '教材：《医学伦理学》+ 标准化病人演练', progress: '进度：已完成（秋季学期闭环）' },
    { id: 'CUR-005', course: '课程名：病例书写规范与电子病历写作', hours: '学时：12 学时（理论 6 + 批改实操 6）', audience: '对象：1 年级住培 + 实习医师', textbook: '教材：本院病历书写规范（对照电子病历模板）', progress: '进度：第 3/6 讲（进行中）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m460Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/teaching/rotations', handle: handleTeachRotations, auth: true },
  { method: 'GET', path: '/api/v1/teaching/preceptors', handle: handleTeachPreceptors, auth: true },
  { method: 'GET', path: '/api/v1/teaching/assessments', handle: handleTeachAssessments, auth: true },
  { method: 'GET', path: '/api/v1/teaching/rounds', handle: handleTeachRounds, auth: true },
  { method: 'GET', path: '/api/v1/teaching/competitions', handle: handleTeachCompetitions, auth: true },
  { method: 'GET', path: '/api/v1/teaching/curriculum', handle: handleTeachCurriculum, auth: true },
];
