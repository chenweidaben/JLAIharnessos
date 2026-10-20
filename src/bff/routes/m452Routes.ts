/**
 * 健澜科技 jlmedaios - M452 审计与安全日志补充（audit）
 *
 * 操作日志 / 登录日志 / 数据导出记录 / 敏感操作审计 / 异常登录 / 日志归档
 * 聚焦审计日志，不重复 M450 安全基线/密评、M448 病历审计导出。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/audit/operation-logs - 操作日志（操作号/用户/动作/对象/时间）5 条 */
async function handleAudOpLogs(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AOL-001', opNo: '操作号：OP-20261020-0118', user: '用户：王*** 主任医师（心内科）', action: '动作：编辑并保存出院记录（修改诊断字段）', target: '对象：病历 EMR-2026-001188', time: '时间：2026-10-20 09:42:14' },
    { id: 'AOL-002', opNo: '操作号：OP-20261020-0122', user: '用户：刘*** 主治医师（内分泌）', action: '动作：开具处方（降糖药调整）', target: '对象：患者 P-2026-002340 处方单 RX-8821', time: '时间：2026-10-20 10:05:33' },
    { id: 'AOL-003', opNo: '操作号：OP-20261019-0307', user: '用户：赵*** 主任医师（外科）', action: '动作：补记手术记录（切口长度）', target: '对象：手术记录 OR-2026-004512', time: '时间：2026-10-19 16:18:50' },
    { id: 'AOL-004', opNo: '操作号：OP-20261019-0411', user: '用户：系统管理员 陈***（IT）', action: '动作：调整角色权限（新增随访专员角色）', target: '对象：权限配置 ROLE-FU-03', time: '时间：2026-10-19 14:30:22' },
    { id: 'AOL-005', opNo: '操作号：OP-20261018-0520', user: '用户：吴*** 病案室（ARC-011）', action: '动作：归档出院病历并封存快照', target: '对象：病历归档 ARC-2026-1018', time: '时间：2026-10-18 17:02:08' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/audit/login-logs - 登录日志（用户/IP/设备/登录结果/时间）5 条 */
async function handleAudLoginLogs(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ALL-001', user: '用户：王*** 主任医师（心内科）', ip: 'IP：10.20.8.112（院内办公网段）', device: '设备：PC 工作站（Chrome / Windows 10）', result: '登录结果：成功（口令+短信二次验证）', time: '时间：2026-10-20 08:15:40' },
    { id: 'ALL-002', user: '用户：刘*** 主治医师（内分泌）', ip: 'IP：10.20.9.201（医生站网段）', device: '设备：移动查房平板（APP / iOS）', result: '登录结果：成功（生物识别+口令）', time: '时间：2026-10-20 08:40:12' },
    { id: 'ALL-003', user: '用户：未知账号 guest01（疑似试探）', ip: 'IP：113.***.***.22（外网，非信任段）', device: '设备：未知（Chrome / Linux UA）', result: '登录结果：失败（口令错误，已触发失败锁定计数）', time: '时间：2026-10-19 23:58:05' },
    { id: 'ALL-004', user: '用户：赵*** 主任医师（外科）', ip: 'IP：10.20.8.156（院内）', device: '设备：PC 工作站（Edge / Windows 11）', result: '登录结果：成功（强口令，单因素）', time: '时间：2026-10-19 07:55:31' },
    { id: 'ALL-005', user: '用户：孙*** 住院医师（急诊）', ip: 'IP：10.20.12.88（急诊网段）', device: '设备：急诊移动终端（APP / Android）', result: '登录结果：成功（夜班交接登录）', time: '时间：2026-10-18 22:10:47' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/audit/export-records - 数据导出记录（导出名/范围/操作人/时间/去向）5 条 */
async function handleAudExportRecords(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'AER-001', name: '导出名：EXP-20261020-01（科室月度报表导出）', scope: '范围：心内科 9 月出院统计（聚合指标，无个人明细）', operator: '操作人：科室秘书 周***（审批通过）', time: '时间：2026-10-20 09:20:15', dest: '去向：院内 BI 报表平台（内网，不落地个人终端）' },
    { id: 'AER-002', name: '导出名：EXP-20261019-02（DRG 病组明细导出）', scope: '范围：普外科 DRG 病组病例明细（含脱敏编码）', operator: '操作人：医保办 郑***（双人审批）', time: '时间：2026-10-19 15:42:30', dest: '去向：加密 U 盘（登记领用，限期归还）' },
    { id: 'AER-003', name: '导出名：EXP-20261019-03（科研队列数据导出）', scope: '范围：科研伦理批准队列（去标识化，120 例）', operator: '操作人：科研办 孙***（伦理批件附后）', time: '时间：2026-10-19 11:10:08', dest: '去向：科研安全区（隔离环境，禁止外发）' },
    { id: 'AER-004', name: '导出名：EXP-20261018-04（患者本人病历复印）', scope: '范围：本人申请复印的本人病历（身份核验）', operator: '操作人：病案室 吴***（ARC-011）', time: '时间：2026-10-18 10:35:52', dest: '去向：纸质打印交付（签收留痕）' },
    { id: 'AER-005', name: '导出名：EXP-20261017-05（对账明细导出）', scope: '范围：医保结算对账明细（财务口径）', operator: '操作人：财务 李***（审批通过）', time: '时间：2026-10-17 16:00:20', dest: '去向：财务内网共享盘（权限限定）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/audit/sensitive-ops - 敏感操作审计（操作/类型/风险级别/审批人/状态）5 条 */
async function handleAudSensitiveOps(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ASO-001', op: '操作：批量修改患者联系方式（导出前清洗）', type: '类型：批量数据变更（非删除）', risk: '风险级别：中（涉及个人信息批量改动）', approver: '审批人：信息科负责人 陈***（双人复核）', status: '状态：已批准执行（操作前后均留痕）' },
    { id: 'ASO-002', op: '操作：物理删除测试环境冗余病历草稿', type: '类型：数据删除（测试库，非生产）', risk: '风险级别：低（隔离测试环境，可恢复）', approver: '审批人：研发负责人 孙***', status: '状态：已批准（删除前已快照备份）' },
    { id: 'ASO-003', op: '操作：重置离职员工账号并回收权限', type: '类型：账号权限变更（注销/禁用）', risk: '风险级别：高（账号回收，需 HR 联动）', approver: '审批人：信息科+人事双审批', status: '状态：已批准执行（账号已禁用）' },
    { id: 'ASO-004', op: '操作：跨科室调阅非本人主管患者完整病历', type: '类型：越权调阅核查（病历查阅）', risk: '风险级别：高（跨科室患者隐私）', approver: '审批人：医务科 王***（说明会诊理由）', status: '状态：已批准（限定时段、只读、留痕）' },
    { id: 'ASO-005', op: '操作：修改历史处方审核记录', type: '类型：历史记录更正（合规留痕更正）', risk: '风险级别：高（处方合规敏感）', approver: '审批人：药剂科+医务科双审批', status: '状态：待审批（已提交，等待复核，暂未执行）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/audit/anomaly-login - 异常登录（用户/异常类型/地点/处置/时间）5 条 */
async function handleAudAnomalyLogin(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ANL-001', user: '用户：王***（主任医师）', type: '异常类型：异地登录（异地 IP 与常用城市不符）', location: '地点：外网 IP（与常用杭州办公地不一致）', action: '处置：实时阻断+二次验证+短信提醒本人确认', time: '时间：2026-10-20 02:12:00' },
    { id: 'ANL-002', user: '用户：guest01（未知账号）', type: '异常类型：连续口令爆破失败（10 次错误）', location: '地点：外网非信任网段', action: '处置：临时封禁 IP，纳入防火墙黑名单观察', time: '时间：2026-10-19 23:58:30' },
    { id: 'ANL-003', user: '用户：刘***（主治医师）', type: '异常类型：非常用设备登录（新设备首次）', location: '地点：院内网段（新个人手机）', action: '处置：要求短信二次验证，设备登记绑定', time: '时间：2026-10-19 19:20:14' },
    { id: 'ANL-004', user: '用户：赵***（主任医师）', type: '异常类型：非工作时段批量尝试（凌晨短时多次）', location: '地点：院内网段（账号本人终端）', action: '处置：拦截并要求复核，账号临时加锁待本人确认', time: '时间：2026-10-18 03:45:09' },
    { id: 'ANL-005', user: '用户：孙***（住院医师）', type: '异常类型：VPN 凭证与院内账号复用异常', location: '地点：外网经 VPN 接入', action: '处置：强制改密并重新发放令牌，安全教育提醒', time: '时间：2026-10-17 21:08:55' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/audit/log-archive - 日志归档（归档号/时间段/条数/存储位置/归档时间）5 条 */
async function handleAudLogArchive(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ALA-001', archiveNo: '归档号：ARC-LOG-202609（9 月操作/登录日志）', period: '时间段：2026-09-01 至 2026-09-30', count: '条数：操作日志 48.6 万条、登录日志 3.2 万条', location: '存储位置：集中日志平台冷存储（对象存储归档桶）', archiveTime: '归档时间：2026-10-05（月末自动归档，在线可检索 6 个月）' },
    { id: 'ALA-002', archiveNo: '归档号：ARC-LOG-202608（8 月安全审计日志）', period: '时间段：2026-08-01 至 2026-08-31', count: '条数：敏感操作 1.1 千条、异常登录 86 条', location: '存储位置：加密归档介质（离线冷备，访问需审批）', archiveTime: '归档时间：2026-09-03' },
    { id: 'ALA-003', archiveNo: '归档号：ARC-LOG-2026Q2（二季度全量日志）', period: '时间段：2026-04-01 至 2026-06-30', count: '条数：全量审计日志约 156 万条（压缩后归档）', location: '存储位置：异地容灾归档（两地三中心副本）', archiveTime: '归档时间：2026-07-08（季度归档，按合规年限留存）' },
    { id: 'ALA-004', archiveNo: '归档号：ARC-LOG-202607（7 月导出记录日志）', period: '时间段：2026-07-01 至 2026-07-31', count: '条数：数据导出记录 214 条（全量留痕）', location: '存储位置：集中日志平台冷存储', archiveTime: '归档时间：2026-08-02' },
    { id: 'ALA-005', archiveNo: '归档号：ARC-LOG-2025H2（2025 下半年历史日志）', period: '时间段：2025-07-01 至 2025-12-31', count: '条数：历史审计日志（超在线期，已转长期归档）', location: '存储位置：长期合规归档库（只读，到期按制度销毁）', archiveTime: '归档时间：2026-01-12' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m452Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/audit/operation-logs', handle: handleAudOpLogs, auth: true },
  { method: 'GET', path: '/api/v1/audit/login-logs', handle: handleAudLoginLogs, auth: true },
  { method: 'GET', path: '/api/v1/audit/export-records', handle: handleAudExportRecords, auth: true },
  { method: 'GET', path: '/api/v1/audit/sensitive-ops', handle: handleAudSensitiveOps, auth: true },
  { method: 'GET', path: '/api/v1/audit/anomaly-login', handle: handleAudAnomalyLogin, auth: true },
  { method: 'GET', path: '/api/v1/audit/log-archive', handle: handleAudLogArchive, auth: true },
];
