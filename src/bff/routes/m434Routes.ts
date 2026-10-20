/**
 * 健澜科技 jlmedaios - M434 数据安全与隐私合规深度（security）
 *
 * 隐私分级台账/敏感访问审计/加密策略/留存与销毁/权限复核记录
 * （masking-rules 脱敏规则已存在，此处不重复）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/security/privacy-classification - 隐私分级台账（数据项/级别L1-L4/处理要求/责任人）5 条 */
async function handleSecPrivacyClassification(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SPC-001', dataItem: '数据项：患者身份证号/医保卡号', level: '级别：L4（高敏感个人信息）', handling: '处理要求：传输 TLS1.2+、存储 AES-256 加密、展示强制脱敏、访问最小授权并留痕', owner: '责任人：信息安全岗（数据保护官 DPO）' },
    { id: 'SPC-002', dataItem: '数据项：诊疗病历文本/诊断结论', level: '级别：L3（敏感医疗健康信息）', handling: '处理要求：院内按角色授权、对外调阅经审批、导出加水印、日志全留痕', owner: '责任人：病案室主任 + 信息科' },
    { id: 'SPC-003', dataItem: '数据项：检验检查结果数值', level: '级别：L3（敏感医疗健康信息）', handling: '处理要求：本人/主治可见，跨院共享经患者授权，禁止明文外发', owner: '责任人：检验科主任 + 信息科' },
    { id: 'SPC-004', dataItem: '数据项：患者姓名/性别/联系电话', level: '级别：L2（一般个人信息）', handling: '处理要求：列表脱敏展示、营销场景禁用、按业务必要采集', owner: '责任人：客服/患者服务中心负责人' },
    { id: 'SPC-005', dataItem: '数据项：科室/设备运行统计、匿名化聚合报表', level: '级别：L1（公开/非个人信息）', handling: '处理要求：匿名化聚合后可用于 BI 分析与上报，不可反推个人', owner: '责任人：运营数据岗' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/access-audit - 敏感访问审计（用户/资源/动作/时间/结果）5 条 */
async function handleSecAccessAudit(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SAA-001', user: '用户：王***（主治医师，工号 D-1024）', resource: '资源：患者 MRN-2026-001188 完整病历（含身份证号）', action: '动作：查看（病历详情页全量读取）', time: '时间：2026-10-20 09:32:11', result: '结果：授权内允许，已留痕（合理访问）' },
    { id: 'SAA-002', user: '用户：系统账号 REPORT-BATCH（夜间报表任务）', resource: '资源：全院 L2/L3 患者清单导出', action: '动作：批量导出（含脱敏字段）', time: '时间：2026-10-20 02:15:00', result: '结果：授权内允许，导出文件加密存证' },
    { id: 'SAA-003', user: '用户：李***（护士，工号 N-018）', resource: '资源：非本人管床患者 MRN-2026-009921 的检验结果', action: '动作：跨管床查询（无授权关联）', time: '时间：2026-10-20 10:08:47', result: '结果：越权拦截（403），触发安全告警并记录' },
    { id: 'SAA-004', user: '用户：外部转诊医院账号 REF-HOSP-03', resource: '资源：患者出院摘要 CDA（经患者授权）', action: '动作：调阅（单次授权，有效期 72 小时）', time: '时间：2026-10-20 11:02:35', result: '结果：授权内允许，访问来源 IP 已记录' },
    { id: 'SAA-005', user: '用户：未知账号（疑似爆破尝试）', resource: '资源：管理后台 admin 登录接口', action: '动作：登录尝试（连续失败 8 次）', time: '时间：2026-10-20 03:47:19', result: '结果：拒绝，账号临时锁定 30 分钟，安全工单已生成' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/encryption-policy - 加密策略（字段/算法/密钥轮换/状态/备注）5 条 */
async function handleSecEncryptionPolicy(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SEP-001', field: '字段：身份证号/医保卡号（L4 静态存储）', algorithm: '算法：AES-256-GCM（字段级加密）', keyRotation: '密钥轮换：主密钥 HSM 托管，每 90 天自动轮换，历史密文重加密', status: '状态：启用', note: '备注：密文与明文分库存储，密钥不落应用配置' },
    { id: 'SEP-002', field: '字段：传输通道（全量 API/院内互联）', algorithm: '算法：TLS 1.3（最低 TLS1.2），证书由院内 CA 签发', keyRotation: '密钥轮换：证书每年轮换，私钥 HSM 保护', status: '状态：启用', note: '备注：禁用 TLS1.0/1.1 与弱密码套件' },
    { id: 'SEP-003', field: '字段：患者手机号/联系地址（L2）', algorithm: '算法：AES-128-CBC + 校验哈希（隐私字段）', keyRotation: '密钥轮换：每 180 天轮换', status: '状态：启用', note: '备注：查询走密文检索索引，不明文返回' },
    { id: 'SEP-004', field: '字段：电子病历签名摘要（防篡改）', algorithm: '算法：SM2/SHA-256 国商密数字签名 + 时间戳', keyRotation: '密钥轮换：签名证书随人事变动及时吊销更新', status: '状态：启用', note: '备注：与 CA 时间戳服务绑定，签名历史可验真' },
    { id: 'SEP-005', field: '字段：备份磁带/异地容灾数据', algorithm: '算法：AES-256 全盘加密（备份介质级）', keyRotation: '密钥轮换：备份密钥独立管理，每年轮换', status: '状态：启用', note: '备注：介质出库需双人审批，销毁有记录' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/retention-destroy - 留存与销毁（数据类别/留存期/到期处理/审批人/状态）5 条 */
async function handleSecRetentionDestroy(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SRD-001', category: '数据类别：住院病历（纸质+电子）', retention: '留存期：患者出院后 ≥30 年（住院），门急诊 ≥15 年', expireAction: '到期处理：届满后经审批匿名化/销毁，保留销毁清单', approver: '审批人：病案委员会 + 信息科主任', status: '状态：执行中（按到期批次处理）' },
    { id: 'SRD-002', category: '数据类别：检验检查原始报告', retention: '留存期：同病历周期（≥15/30 年）', expireAction: '到期处理：随病历归档统一销毁，影像云胶片同步清理', approver: '审批人：检验科主任 + 病案室', status: '状态：执行中' },
    { id: 'SRD-003', category: '数据类别：就诊/操作审计日志', retention: '留存期：在线 1 年，归档 ≥3 年（等保要求）', expireAction: '到期处理：自动归档至冷存储，届满后安全删除', approver: '审批人：信息安全岗', status: '状态：自动任务运行中' },
    { id: 'SRD-004', category: '数据类别：营销/推送订阅记录（非诊疗）', retention: '留存期：用户退订后 6 个月内删除', expireAction: '到期处理：退订即停止采集，6 个月后物理删除', approver: '审批人：患者服务中心负责人', status: '状态：执行中' },
    { id: 'SRD-005', category: '数据类别：已注销/死亡患者个人信息', retention: '留存期：病历法定期满后处理，非诊疗附属信息及时清理', expireAction: '到期处理：非诊疗附属字段匿名化，诊疗主体按法定期保留', approver: '审批人：DPO + 法务', status: '状态：待本季度批次复核' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/security/permission-review - 权限复核记录（角色/复核项/风险等级/处置/复核人）5 条 */
async function handleSecPermissionReview(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SPR-001', role: '角色：离职医生 D-2077（已离岗 60 天）', reviewItem: '复核项：仍保留病历查看与处方开具权限', risk: '风险等级：高（僵尸账号越权风险）', action: '处置：禁用账号、回收全部角色、工单闭环', reviewer: '复核人：信息安全岗 + 科室主任' },
    { id: 'SPR-002', role: '角色：轮转护士 N-031（已转科）', reviewItem: '复核项：原科室 LIS/PACS 查看权限未随转科回收', risk: '风险等级：中（跨科室数据访问）', action: '处置：回收原科室权限，按新科室重新授权', reviewer: '复核人：护理部 + 信息科' },
    { id: 'SPR-003', role: '角色：科室主任 D-1001', reviewItem: '复核项：具备跨科室全量病历查看（管理视图）', risk: '风险等级：中（权限范围超出临床必要）', action: '处置：保留管理视图但启用审批留痕，季度复核', reviewer: '复核人：DPO' },
    { id: 'SPR-004', role: '角色：第三方运维账号 OPS-VENDOR-02', reviewItem: '复核项：生产库只读权限长期开放（无到期日）', risk: '风险等级：高（外包长期高权限）', action: '处置：改为工单制临时授权、到期自动收回', reviewer: '复核人：信息科主任 + 采购合同管理' },
    { id: 'SPR-005', role: '角色：门诊挂号员 FR-009', reviewItem: '复核项：仅需排班/挂号权限，无越权', risk: '风险等级：低（最小权限符合）', action: '处置：确认合规，无需调整', reviewer: '复核人：门诊部主任' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m434Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/security/privacy-classification', handle: handleSecPrivacyClassification, auth: true },
  { method: 'GET', path: '/api/v1/security/access-audit', handle: handleSecAccessAudit, auth: true },
  { method: 'GET', path: '/api/v1/security/encryption-policy', handle: handleSecEncryptionPolicy, auth: true },
  { method: 'GET', path: '/api/v1/security/retention-destroy', handle: handleSecRetentionDestroy, auth: true },
  { method: 'GET', path: '/api/v1/security/permission-review', handle: handleSecPermissionReview, auth: true },
];
