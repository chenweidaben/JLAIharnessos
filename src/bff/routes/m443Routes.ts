/**
 * 健澜科技 jlmedaios - M443 科研教学深度（research / teaching）
 *
 * 论文成果 / 教学排班 / 住培考核 / 继续教育
 * （projects 课题、ethics 伦理审查已存在，此处不重复）。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/research/publications - 论文成果（论文号/标题/作者/期刊/收录情况）5 条 */
async function handleResPublications(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'RPB-001', paperNo: '论文号：PUB-2026-001（第一作者）', title: '标题：AI 辅助影像阅片在肺结节筛查中的诊断效能研究', authors: '作者：王***（通讯）、李***、张*** 等', journal: '期刊：《中华放射学杂志》（北大核心/CSCD）', indexing: '收录情况：已录用，网络首发，EI 暂未收录' },
    { id: 'RPB-002', paperNo: '论文号：PUB-2026-002（通讯作者）', title: '标题：基于真实世界数据的 2 型糖尿病并发症风险预测模型构建', authors: '作者：刘***（一作）、陈***（通讯，本文通讯单位为本院）', journal: '期刊：《中国糖尿病杂志》（科技核心）', indexing: '收录情况：已见刊，被引 3 次' },
    { id: 'RPB-003', paperNo: '论文号：PUB-2026-003（合作论文）', title: '标题：多学科协作（MDT）在复杂肿瘤个体化治疗中的应用价值', authors: '作者：赵***、钱*** 等（本院为合作单位）', journal: '期刊：《肿瘤防治研究》（CSCD 扩展）', indexing: '收录情况：已见刊，Scopus 收录' },
    { id: 'RPB-004', paperNo: '论文号：PUB-2026-004（会议摘要）', title: '标题：智能预问诊系统对门诊诊疗效率的影响：单中心回顾性研究', authors: '作者：孙***（一作）', journal: '期刊：中华医学会学术年会（壁报交流）', indexing: '收录情况：会议摘要，未正式收录' },
    { id: 'RPB-005', paperNo: '论文号：PUB-2025-018（高被引）', title: '标题：县域紧密型医共体慢病一体化管理模式实践与成效', authors: '作者：周***（通讯）等', journal: '期刊：《中国卫生事业管理》（CSSCI 扩展/核心）', indexing: '收录情况：已见刊，下载 1200+，入选高被引论文' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/teaching/schedules - 教学排班（课程/讲师/班级/时间/地点）5 条 */
async function handleTeachSchedules(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TSC-001', course: '课程：内科学（心血管系统总论）理论课', lecturer: '讲师：王*** 主任医师（内科教研室）', class: '班级：临床医学 2022 级 1 班（45 人）', time: '时间：2026-10-21 08:00-09:40（周三上午）', place: '地点：教学楼 A301 多媒体教室' },
    { id: 'TSC-002', course: '课程：外科学（无菌术与外科基本操作）实验课', lecturer: '讲师：赵*** 副主任医师（外科教研室）', class: '班级：临床医学 2022 级 2 班', time: '时间：2026-10-21 10:00-11:40', place: '地点：临床技能中心 204 实验室' },
    { id: 'TSC-003', course: '课程：诊断学（体格检查标准化病人问诊）', lecturer: '讲师：刘*** 主治医师', class: '班级：临床医学 2023 级 1 班（分组 6 组）', time: '时间：2026-10-22 14:00-16:00', place: '地点：OSCE 考站模拟诊室' },
    { id: 'TSC-004', course: '课程：医学人文与医患沟通案例讨论（PBL）', lecturer: '讲师：孙*** 副教授（人文教研室）', class: '班级：临床医学 2022 级 1 班', time: '时间：2026-10-23 19:00-20:30（晚间）', place: '地点：教学楼 B105' },
    { id: 'TSC-005', course: '课程：急诊医学（心肺复苏与 AED 实操）', lecturer: '讲师：周*** 副主任医师（急诊教研室）', class: '班级：护理学 2023 级（38 人）', time: '时间：2026-10-24 09:00-11:00', place: '地点：急救技能训练馆 301' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/teaching/residency - 住培考核（学员/科室/考核项/成绩/带教老师）5 条 */
async function handleTeachResidency(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TRD-001', trainee: '学员：林***（内科住培第 2 年）', dept: '科室：心内科轮转（2026-09 至 2026-10）', examItem: '考核项：出科理论考核 + 病历书写质量', score: '成绩：理论 88 分，病历优良', preceptor: '带教老师：王*** 主任医师（轮转鉴定优秀）' },
    { id: 'TRD-002', trainee: '学员：吴***（外科住培第 1 年）', dept: '科室：普外科轮转', examItem: '考核项：外科基本操作 + 无菌观念 OSCE', score: '成绩：操作 82 分，合格', preceptor: '带教老师：赵*** 副主任医师' },
    { id: 'TRD-003', trainee: '学员：郑***（全科住培第 3 年）', dept: '科室：社区卫生服务中心轮转', examItem: '考核项：全科慢病管理门诊接诊 + 健康宣教', score: '成绩：86 分，合格', preceptor: '带教老师：周*** 全科主任医师' },
    { id: 'TRD-004', trainee: '学员：黄***（儿科住培第 2 年）', dept: '科室：儿科门诊/病房轮转', examItem: '考核项：儿童常见病鉴别诊断 + 病史采集', score: '成绩：79 分，需补考完善', preceptor: '带教老师：刘*** 主治医师' },
    { id: 'TRD-005', trainee: '学员：徐***（急诊住培第 2 年）', dept: '科室：急诊医学科轮转', examItem: '考核项：急诊分诊 + 抢救流程应急处置', score: '成绩：90 分，优秀', preceptor: '带教老师：周*** 副主任医师' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/teaching/continuing-edu - 继续教育（项目/学员/学分/完成状态/时间）5 条 */
async function handleTeachContinuingEdu(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TCE-001', program: '项目：2026 省级继续医学教育项目《心肺复苏高级生命支持（ACLS）培训班》', trainee: '学员：本院 王***（心内科医师）', credits: '学分：Ⅰ 类 6.0 学分', status: '完成状态：已完成并考核合格', time: '时间：2026-10-12（线下 2 天，已登记学分）' },
    { id: 'TCE-002', program: '项目：国家级继教项目《基层糖尿病规范化诊疗新进展》线上课程', trainee: '学员：李***（内分泌科护士）', credits: '学分：Ⅱ 类 3.0 学分', status: '完成状态：学习中（已完成 70%）', time: '时间：2026-10-01 至 2026-10-31 学习周期' },
    { id: 'TCE-003', program: '项目：院内年度继教《医疗质量安全核心制度解读》专题讲座', trainee: '学员：赵***（外科住培医师）', credits: '学分：Ⅱ 类 2.0 学分', status: '完成状态：已完成（签到+考核）', time: '时间：2026-10-15 院内报告厅' },
    { id: 'TCE-004', program: '项目：线上继教《医患沟通与纠纷预防实务》微课系列', trainee: '学员：孙***（门诊导诊岗）', credits: '学分：Ⅱ 类 1.5 学分', status: '完成状态：未开始（待报名）', time: '时间：2026-11 月学习计划' },
    { id: 'TCE-005', program: '项目：市级继教《护理不良事件上报与根因分析（RCA）工作坊》', trainee: '学员：周***（外科护士长）', credits: '学分：Ⅰ 类 4.0 学分', status: '完成状态：已完成并获结业证书', time: '时间：2026-10-08（1 天工作坊）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m443Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/research/publications', handle: handleResPublications, auth: true },
  { method: 'GET', path: '/api/v1/teaching/schedules', handle: handleTeachSchedules, auth: true },
  { method: 'GET', path: '/api/v1/teaching/residency', handle: handleTeachResidency, auth: true },
  { method: 'GET', path: '/api/v1/teaching/continuing-edu', handle: handleTeachContinuingEdu, auth: true },
];
