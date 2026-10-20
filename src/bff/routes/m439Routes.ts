/**
 * 健澜科技 jlmedaios - M439 体检健康管理深度（physical）
 *
 * 体检预约/体检报告/总检记录/异常追踪/健康档案
 * （packages 体检套餐已存在，此处不重复）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/physical/appointments - 体检预约（预约号/受检人/套餐/日期/状态）5 条 */
async function handlePhysAppointments(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PPA-001', apptNo: '预约号：PE-20261021-01（单位团体体检）', person: '受检人：陈***（男，40 岁，企业团体）', packageName: '套餐：中年精英健康套餐（38 项）', date: '日期：2026-10-21 上午 08:00', status: '状态：已预约（已发送检前须知，空腹禁食提醒）' },
    { id: 'PPA-002', apptNo: '预约号：PE-20261021-02（个人自费）', person: '受检人：林***（女，52 岁，个人预约）', packageName: '套餐：女性关爱套餐（含乳腺/妇科，32 项）', date: '日期：2026-10-21 上午 09:00', status: '状态：已预约' },
    { id: 'PPA-003', apptNo: '预约号：PE-20261022-03（职业健康）', person: '受检人：黄***（男，35 岁，粉尘作业岗）', packageName: '套餐：职业健康监护套餐（含胸片/肺功能）', date: '日期：2026-10-22 上午 08:30', status: '状态：已预约（单位组织，批量到场）' },
    { id: 'PPA-004', apptNo: '预约号：PE-20261020-04（当日已检）', person: '受检人：吴***（男，60 岁，个人）', packageName: '套餐：老年综合体检套餐（45 项）', date: '日期：2026-10-20 上午（已完成全部项目）', status: '状态：已完成待出报告' },
    { id: 'PPA-005', apptNo: '预约号：PE-20261023-05（改期）', person: '受检人：郑***（女，28 岁，备孕检查）', packageName: '套餐：备孕优生套餐（26 项）', date: '日期：2026-10-23 上午（由原 10-20 改期）', status: '状态：已改期（原号释放，已通知受检人）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/physical/reports-detail - 体检报告（报告号/受检人/总检结论/异常项数/状态）5 条 */
async function handlePhysReports(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PRP-001', reportNo: '报告号：PERPT-20261020-01（陈***团体体检）', person: '受检人：陈***（男，40 岁）', conclusion: '总检结论：总体良好，脂肪肝（轻度）、血脂偏高，建议生活方式干预', abnormalCount: '异常项数：3 项（脂肪肝/甘油三酯升高/尿酸偏高）', status: '状态：已出具（总检已审，可线上查看）' },
    { id: 'PRP-002', reportNo: '报告号：PERPT-20261020-02（吴***老年体检）', person: '受检人：吴***（男，60 岁）', conclusion: '总检结论：冠状动脉钙化积分升高、血压偏高，建议心内科就诊评估', abnormalCount: '异常项数：5 项（钙化/高血压/血糖临界/甲状腺结节/前列腺增生）', status: '状态：已出具' },
    { id: 'PRP-003', reportNo: '报告号：PERPT-20261019-03（林***个人）', person: '受检人：林***（女，52 岁）', conclusion: '总检结论：乳腺增生（良性）、骨量减少，建议补钙与骨密度复查', abnormalCount: '异常项数：2 项（乳腺增生/骨量减少）', status: '状态：已出具' },
    { id: 'PRP-004', reportNo: '报告号：PERPT-20261020-04（待总检）', person: '受检人：黄***（男，35 岁，职业体检）', conclusion: '总检结论：各分科结果已齐，待总检医生汇总', abnormalCount: '异常项数：待总检汇总', status: '状态：出具中（等待总检签发）' },
    { id: 'PRP-005', reportNo: '报告号：PERPT-20261018-05（郑***备孕）', person: '受检人：郑***（女，28 岁）', conclusion: '总检结论：各项基本正常，叶酸水平偏低，建议补充叶酸后备孕', abnormalCount: '异常项数：1 项（叶酸偏低）', status: '状态：已出具' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/physical/general-exam - 总检记录（报告号/总检医生/建议/审核时间/状态）5 条 */
async function handlePhysGeneralExam(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PGE-001', reportNo: '报告号：PERPT-20261020-01（陈***）', doctor: '总检医生：王***（主任医师，工号 PE-003）', advice: '建议：控制油脂摄入、减重 5kg、3 个月后复查血脂与肝功能，戒烟限酒', auditTime: '审核时间：2026-10-20 12:20:18', status: '状态：总检签发完成' },
    { id: 'PGE-002', reportNo: '报告号：PERPT-20261020-02（吴***）', doctor: '总检医生：王***（主任医师，工号 PE-003）', advice: '建议：心内科进一步评估冠脉钙化，监测血压，低盐饮食，必要时冠脉 CTA', auditTime: '审核时间：2026-10-20 12:45:40', status: '状态：总检签发完成' },
    { id: 'PGE-003', reportNo: '报告号：PERPT-20261019-03（林***）', doctor: '总检医生：李***（副主任医师，工号 PE-007）', advice: '建议：乳腺定期 6-12 月超声随访，骨密度复查，补充钙与维生素 D', auditTime: '审核时间：2026-10-19 16:10:55', status: '状态：总检签发完成' },
    { id: 'PGE-004', reportNo: '报告号：PERPT-20261020-04（黄***职业体检）', doctor: '总检医生：待王***总检（分科结果已汇总）', advice: '建议：待总检医生综合职业接触史出具结论与调岗建议', auditTime: '审核时间：待审核', status: '状态：待总检签发' },
    { id: 'PGE-005', reportNo: '报告号：PERPT-20261018-05（郑***备孕）', doctor: '总检医生：李***（副主任医师，工号 PE-007）', advice: '建议：每日补充 0.4-0.8mg 叶酸，规律作息，3 个月后备孕随访', auditTime: '审核时间：2026-10-18 15:30:22', status: '状态：总检签发完成' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/physical/abnormal-tracking - 异常追踪（受检人/异常项/复查建议/复查状态/跟进人）5 条 */
async function handlePhysAbnormalTracking(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PAT-001', person: '受检人：陈***（男，40 岁，脂肪肝/血脂偏高）', abnormalItem: '异常项：甘油三酯 2.4mmol/L、轻度脂肪肝', followAdvice: '复查建议：3 个月后复查血脂+肝功能+肝脏超声', followStatus: '复查状态：待复查（已建追踪任务，到期提醒）', follower: '跟进人：健康管理师 周***（HM-011）' },
    { id: 'PAT-002', person: '受检人：吴***（男，60 岁，冠脉钙化升高）', abnormalItem: '异常项：冠状动脉钙化积分 320（中高危）', followAdvice: '复查建议：1 个月内心内科门诊评估，必要时冠脉 CTA', followStatus: '复查状态：已预约心内科（2026-10-28 就诊）', follower: '跟进人：健康管理师 周***（HM-011）' },
    { id: 'PAT-003', person: '受检人：林***（女，52 岁，乳腺增生）', abnormalItem: '异常项：双侧乳腺增生（BI-RADS 2 类良性）', followAdvice: '复查建议：6-12 月乳腺超声随访，自查乳房', followStatus: '复查状态：待复查（已纳入年度随访计划）', follower: '跟进人：健康管理师 吴***（HM-015）' },
    { id: 'PAT-004', person: '受检人：黄***（男，35 岁，职业粉尘接触）', abnormalItem: '异常项：肺功能轻度下降（职业监护）', followAdvice: '复查建议：1 年职业健康复查，加强防尘防护', followStatus: '复查状态：待复查（职业病防治跟踪）', follower: '跟进人：职业健康专员 郑***（OH-002）' },
    { id: 'PAT-005', person: '受检人：郑***（女，28 岁，叶酸偏低）', abnormalItem: '异常项：血清叶酸 6.2nmol/L（偏低）', followAdvice: '复查建议：补充叶酸 3 个月后复测', followStatus: '复查状态：已复查（2026-10-18 复测已达标，闭环）', follower: '跟进人：健康管理师 吴***（HM-015）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/physical/archives - 健康档案（受检人/档案号/历次体检/风险等级/更新时间）5 条 */
async function handlePhysArchives(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PAR-001', person: '受检人：陈***（男，40 岁）', archiveNo: '档案号：HEA-2023-00188（连续健康档案）', history: '历次体检：2023/2024/2025/2026 共 4 次（趋势对比可见）', riskLevel: '风险等级：中危（代谢综合征倾向，脂肪肝+血脂）', updateTime: '更新时间：2026-10-20 12:25' },
    { id: 'PAR-002', person: '受检人：吴***（男，60 岁）', archiveNo: '档案号：HEA-2019-00042（长期随访档案）', history: '历次体检：2019-2026 共 8 次（心血管指标逐年跟踪）', riskLevel: '风险等级：高危（冠脉钙化+高血压，心血管事件高风险）', updateTime: '更新时间：2026-10-20 12:50' },
    { id: 'PAR-003', person: '受检人：林***（女，52 岁）', archiveNo: '档案号：HEA-2021-00361', history: '历次体检：2021/2023/2025/2026 共 4 次（乳腺/骨密度跟踪）', riskLevel: '风险等级：低危（良性增生，骨量减少待干预）', updateTime: '更新时间：2026-10-19 16:15' },
    { id: 'PAR-004', person: '受检人：黄***（男，35 岁）', archiveNo: '档案号：HEA-2022-00720（职业健康档案）', history: '历次体检：2022-2026 职业监护共 5 次（职业接触跟踪）', riskLevel: '风险等级：中危（职业粉尘暴露，肺功能下降）', updateTime: '更新时间：2026-10-20 11:30' },
    { id: 'PAR-005', person: '受检人：郑***（女，28 岁）', archiveNo: '档案号：HEA-2026-00115（新建备孕档案）', history: '历次体检：2026 首次（既往无档案，建档起始）', riskLevel: '风险等级：低危（整体健康，叶酸补充中）', updateTime: '更新时间：2026-10-18 15:35' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m439Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/physical/appointments', handle: handlePhysAppointments, auth: true },
  { method: 'GET', path: '/api/v1/physical/reports-detail', handle: handlePhysReports, auth: true },
  { method: 'GET', path: '/api/v1/physical/general-exam', handle: handlePhysGeneralExam, auth: true },
  { method: 'GET', path: '/api/v1/physical/abnormal-tracking', handle: handlePhysAbnormalTracking, auth: true },
  { method: 'GET', path: '/api/v1/physical/archives', handle: handlePhysArchives, auth: true },
];
