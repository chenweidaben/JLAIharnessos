/**
 * 健澜科技 jlmedaios - M360 P0 合规改造：隐私保护深度打磨
 *
 * 隐私政策/隐私同意/隐私权利/隐私通知/隐私违规/隐私投诉（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/security/privacy-policy - 隐私政策 5 条 */
async function handleSecurityPrivacyPolicy(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SPP-001', policyName: '患者隐私保护政策', version: 'v2.0（2026 年修订版）', content: '本政策说明我们如何收集、使用、存储和保护您的个人健康信息（PHI），包括：① 收集您的病历数据、检验结果、影像结果等；② 使用您的数据进行诊疗、医保结算等；③ 加密存储您的数据；④ 仅在必要时共享您的数据（如区域医疗平台共享）', publishTime: '2026-01-01（最近更新：2026-06-01）', status: '生效中' },
    { id: 'SPP-002', policyName: '互联网医院隐私政策', version: 'v1.5（2025 年修订版）', content: '本政策说明我们如何收集、使用、存储和保护您在互联网医院平台上的个人信息，包括：① 收集您的注册信息、就诊记录等；② 使用您的信息进行在线问诊、药品配送等；③ 加密传输您的信息', publishTime: '2025-06-01（最近更新：2025-12-01）', status: '生效中' },
    { id: 'SPP-003', policyName: '患者端 APP 隐私政策', version: 'v1.2（2025 年修订版）', content: '本政策说明我们如何收集、使用、存储和保护您在患者端 APP 上的个人信息，包括：① 收集您的设备信息、位置信息等；② 使用您的信息进行预约挂号、报告查询等；③ 加密存储您的信息', publishTime: '2025-03-01（最近更新：2025-09-01）', status: '生效中' },
    { id: 'SPP-004', policyName: '员工隐私政策', version: 'v1.0（2024 年发布）', content: '本政策说明我们如何收集、使用、存储和保护员工的个人信息，包括：① 收集员工的基本信息、工作信息等；② 使用员工的信息进行人事管理、薪酬发放等；③ 加密存储员工的信息', publishTime: '2024-01-01（最近更新：2024-06-01）', status: '生效中' },
    { id: 'SPP-005', policyName: '访客隐私政策', version: 'v1.0（2024 年发布）', content: '本政策说明我们如何收集、使用、存储和保护访客的个人信息，包括：① 收集访客的基本信息、来访记录等；② 使用访客的信息进行门禁管理、安全管理等；③ 加密存储访客的信息', publishTime: '2024-01-01（最近更新：2024-06-01）', status: '生效中' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/privacy-consent - 隐私同意 5 条 */
async function handleSecurityPrivacyConsent(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SPC-001', user: '张***（心内科住院患者）', consentItem: '同意收集并使用我的病历数据进行诊疗', time: '2026-10-15 09:00:00（同意时间）', method: '电子签名（患者在电子病历系统中签署同意书）', status: '已同意' },
    { id: 'SPC-002', user: '李***（骨科住院患者）', consentItem: '同意将我的检验结果共享给区域医疗平台', time: '2026-10-16 10:00:00（同意时间）', method: '纸质同意书（患者在纸质同意书上签字）', status: '已同意' },
    { id: 'SPC-003', user: '王***（门诊患者）', consentItem: '同意使用我的位置信息进行预约挂号', time: '2026-10-17 11:00:00（同意时间）', method: 'APP 弹窗同意（患者在患者端 APP 中点击同意）', status: '已同意' },
    { id: 'SPC-004', user: '刘***（急诊患者）', consentItem: '同意将我的影像结果共享给其他医院（紧急情况）', time: '2026-10-18 14:00:00（同意时间）', method: '口头同意（患者在急诊时口头同意，护士记录）', status: '已同意' },
    { id: 'SPC-005', user: '陈***（互联网医院患者）', consentItem: '同意使用我的在线问诊记录进行医疗质量改进', time: '2026-10-19 15:00:00（同意时间）', method: '网页弹窗同意（患者在互联网医院网页中点击同意）', status: '已同意' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/privacy-rights - 隐私权利 5 条 */
async function handleSecurityPrivacyRights(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SPR-001', rightName: '知情同意权', description: '患者有权知情医院收集、使用、共享其个人健康信息的情况，并自主决定是否同意', exerciseMethod: '患者可通过患者端 APP 查看隐私政策，并在首次使用时点击同意', status: '已落实', note: '符合《个人信息保护法》要求' },
    { id: 'SPR-002', rightName: '查阅复制权', description: '患者有权查阅、复制其个人健康信息（病历、检验结果、影像结果等）', exerciseMethod: '患者可通过患者端 APP 在线查阅、下载其个人健康信息', status: '已落实', note: '符合《个人信息保护法》要求' },
    { id: 'SPR-003', rightName: '更正补充权', description: '患者有权更正、补充其不准确或不完整的个人健康信息', exerciseMethod: '患者可通过患者端 APP 提交更正申请，或到医院窗口办理更正', status: '已落实', note: '符合《个人信息保护法》要求' },
    { id: 'SPR-004', rightName: '删除权', description: '患者有权要求删除其个人健康信息（在法定情形下）', exerciseMethod: '患者可通过患者端 APP 提交删除申请，或到医院窗口办理删除', status: '已落实', note: '符合《个人信息保护法》要求' },
    { id: 'SPR-005', rightName: '撤回同意权', description: '患者有权撤回此前给予的同意（不再同意医院使用其个人健康信息）', exerciseMethod: '患者可通过患者端 APP 撤回同意，或到医院窗口办理撤回', status: '已落实', note: '符合《个人信息保护法》要求' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/privacy-notice - 隐私通知 5 条 */
async function handleSecurityPrivacyNotice(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SPN-001', noticeNo: 'NOTICE-2026-10-20-000001', type: '隐私政策更新通知', receiver: '所有患者（通过患者端 APP 推送）', content: '我们的隐私政策已更新（v2.0 版本），请您查阅并重新同意。更新内容包括：新增数据共享范围说明、完善患者权利说明等', time: '2026-10-20 09:00:00（通知发送时间）' },
    { id: 'SPN-002', noticeNo: 'NOTICE-2026-10-20-000002', type: '数据泄露预警通知', receiver: '受影响患者（100 名患者，通过短信通知）', content: '我们发现部分患者的联系方式数据可能泄露（约 100 名患者），已采取补救措施（重置密码、加强安全防护），请您注意保护个人信息', time: '2026-10-20 10:00:00（通知发送时间）' },
    { id: 'SPN-003', noticeNo: 'NOTICE-2026-10-20-000003', type: '数据共享通知', receiver: '同意共享的患者（500 名患者，通过患者端 APP 推送）', content: '您的检验结果数据已共享给区域医疗平台（用于区域医疗协同），如需撤回共享，请在患者端 APP 中操作', time: '2026-10-20 11:00:00（通知发送时间）' },
    { id: 'SPN-004', noticeNo: 'NOTICE-2026-10-20-000004', type: '数据使用通知', receiver: '同意使用的患者（1000 名患者，通过患者端 APP 推送）', content: '您的病历数据已用于医疗质量改进分析（匿名化处理），如需停止使用，请在患者端 APP 中操作', time: '2026-10-20 14:00:00（通知发送时间）' },
    { id: 'SPN-005', noticeNo: 'NOTICE-2026-10-20-000005', type: '数据存储通知', receiver: '所有患者（通过患者端 APP 推送）', content: '您的个人健康信息将存储 15 年（符合《医疗机构病历管理规定》要求），到期后将自动删除', time: '2026-10-20 15:00:00（通知发送时间）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/privacy-violation - 隐私违规 5 条 */
async function handleSecurityPrivacyViolation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SPV-001', violationNo: 'VIOLATION-2026-10-20-000001', type: '数据泄露（联系方式泄露）', description: '部分患者的联系方式数据可能泄露（约 100 名患者），原因是系统漏洞被利用', impact: '可能导致患者收到垃圾短信、诈骗电话等', status: '已处置（已修复漏洞、重置密码、通知受影响患者）' },
    { id: 'SPV-002', violationNo: 'VIOLATION-2026-10-20-000002', type: '越权访问（非授权调阅病历）', description: '一名实习医生未经授权调阅了 5 名患者的病历（超出其权限范围）', impact: '可能导致患者隐私数据被非授权人员查看', status: '已处置（已警告实习医生、收回其调阅权限、通知患者）' },
    { id: 'SPV-003', violationNo: 'VIOLATION-2026-10-20-000003', type: '数据误用（将病历数据用于商业目的）', description: '一名员工将 10 名患者的病历数据用于商业推广（未经患者同意）', impact: '可能导致患者收到商业推广信息', status: '已处置（已辞退该员工、删除商业推广信息、通知患者）' },
    { id: 'SPV-004', violationNo: 'VIOLATION-2026-10-20-000004', type: '数据未加密传输（登录接口明文传输密码）', description: '登录接口存在敏感数据明文传输漏洞（用户名和密码在网络中明文传输）', impact: '可能导致用户密码被窃取', status: '已处置（已启用 HTTPS 加密传输）' },
    { id: 'SPV-005', violationNo: 'VIOLATION-2026-10-20-000005', type: '数据未脱敏（导出数据未脱敏）', description: '一次数据导出操作中，导出的患者数据未进行脱敏处理（约 1000 名患者）', impact: '可能导致患者隐私数据泄露', status: '已处置（已删除未脱敏数据、重新导出脱敏数据、通知相关部门）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/privacy-complaint - 隐私投诉 5 条 */
async function handleSecurityPrivacyComplaint(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SPC-001', complaintNo: 'COMPLAINT-2026-10-20-000001', complainant: '张***（心内科住院患者）', type: '数据泄露投诉', content: '我最近收到很多垃圾短信，怀疑我的联系方式被医院泄露了，请你们调查并给我答复', status: '已处理（已调查、确认是系统漏洞导致、已修复漏洞、已答复患者）' },
    { id: 'SPC-002', complaintNo: 'COMPLAINT-2026-10-20-000002', complainant: '李***（骨科住院患者）', type: '越权访问投诉', content: '我发现我的病历被一名实习医生调阅了（我不认识他），请你们解释并处理', status: '已处理（已调查、确认是实习医生越权调阅、已警告实习医生、已答复患者）' },
    { id: 'SPC-003', complaintNo: 'COMPLAINT-2026-10-20-000003', complainant: '王***（门诊患者）', type: '数据共享投诉', content: '我不希望我的检验结果共享给区域医疗平台，请你们停止共享', status: '已处理（已停止共享、已答复患者）' },
    { id: 'SPC-004', complaintNo: 'COMPLAINT-2026-10-20-000004', complainant: '刘***（急诊患者）', type: '数据使用投诉', content: '我不希望我的病历数据用于医疗质量改进分析，请你们停止使用', status: '已处理（已停止使用、已答复患者）' },
    { id: 'SPC-005', complaintNo: 'COMPLAINT-2026-10-20-000005', complainant: '陈***（互联网医院患者）', type: '隐私政策投诉', content: '我认为你们的隐私政策不够清晰（特别是数据共享范围），请你们完善', status: '已处理（已完善隐私政策、已答复患者）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m360Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/security/privacy-policy', handle: handleSecurityPrivacyPolicy, auth: true },
  { method: 'GET', path: '/api/v1/security/privacy-consent', handle: handleSecurityPrivacyConsent, auth: true },
  { method: 'GET', path: '/api/v1/security/privacy-rights', handle: handleSecurityPrivacyRights, auth: true },
  { method: 'GET', path: '/api/v1/security/privacy-notice', handle: handleSecurityPrivacyNotice, auth: true },
  { method: 'GET', path: '/api/v1/security/privacy-violation', handle: handleSecurityPrivacyViolation, auth: true },
  { method: 'GET', path: '/api/v1/security/privacy-complaint', handle: handleSecurityPrivacyComplaint, auth: true },
];
