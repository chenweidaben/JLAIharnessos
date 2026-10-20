/**
 * 健澜科技 jlmedaios - M448 病历版本与留痕合规深化（emr）
 *
 * 修改痕迹 / 合规快照 / 审计导出 / 版本策略 / 锁冲突提示
 * （signatures 电子签名验签已存在，此处不重复）。
 * 聚焦留痕合规，不重复 M425 的 versions/diff、versions/restore、locks 口径。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/emr/change-trail - 修改痕迹（病历号/修改字段/旧值/新值/修改人/时间）5 条 */
async function handleEmrChangeTrail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ECT-001', mrNo: '病历号：EMR-2026-001188（冠心病出院记录）', field: '修改字段：出院诊断（补充并发症）', oldValue: '旧值：冠状动脉粥样硬化性心脏病、不稳定型心绞痛', newValue: '新值：冠状动脉粥样硬化性心脏病、不稳定型心绞痛、高血压 2 级（很高危）', editor: '修改人：王*** 主任医师（上级医师审改）', time: '时间：2026-10-19 16:20:14' },
    { id: 'ECT-002', mrNo: '病历号：EMR-2026-002340（糖尿病病程记录）', field: '修改字段：血糖记录数值（笔误更正）', oldValue: '旧值：空腹血糖 8.6 mmol/L（误记为 12.6）', newValue: '新值：空腹血糖 8.6 mmol/L（更正为实测值）', editor: '修改人：刘*** 主治医师', time: '时间：2026-10-19 10:05:40' },
    { id: 'ECT-003', mrNo: '病历号：EMR-2026-004512（膝关节置换手术记录）', field: '修改字段：手术切口长度（补记精确值）', oldValue: '旧值：切口约 12cm（约数）', newValue: '新值：切口 12.5cm（精确测量补记）', editor: '修改人：赵*** 主任医师（术者补记）', time: '时间：2026-10-20 09:30:22' },
    { id: 'ECT-004', mrNo: '病历号：EMR-2026-006671（阑尾炎入院记录）', field: '修改字段：既往史（补充手术史）', oldValue: '旧值：既往体健，否认手术史', newValue: '新值：既往 2018 年阑尾切除（既往史补充更正）', editor: '修改人：孙*** 主治医师', time: '时间：2026-10-18 14:42:08' },
    { id: 'ECT-005', mrNo: '病历号：EMR-2026-007820（顺产分娩记录）', field: '修改字段：新生儿 Apgar 评分（复核更正）', oldValue: '旧值：1 分钟 Apgar 8 分（误记为 9 分）', newValue: '新值：1 分钟 Apgar 8 分，5 分钟 10 分（复核更正）', editor: '修改人：周*** 副主任医师', time: '时间：2026-10-20 11:18:55' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/snapshots - 合规快照（病历号/快照号/内容哈希/封存人/封存时间）5 条 */
async function handleEmrSnapshots(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ESN-001', mrNo: '病历号：EMR-2026-001188（出院病历封存）', snapshotNo: '快照号：SNAP-20261019-01（出院归档快照）', hash: '内容哈希：SHA-256 a9f3…7c21（防篡改指纹，不可变）', sealer: '封存人：病案室 吴***（ARC-011）', sealTime: '封存时间：2026-10-19 17:00:00（归档即封存）' },
    { id: 'ESN-002', mrNo: '病历号：EMR-2026-002340（住院中期快照）', snapshotNo: '快照号：SNAP-20261015-02（阶段留痕快照）', hash: '内容哈希：SHA-256 5b1d…e8a0', sealer: '封存人：质控科 李***（QC-005）', sealTime: '封存时间：2026-10-15 12:00:00（阶段性合规留痕）' },
    { id: 'ESN-003', mrNo: '病历号：EMR-2026-004512（手术前快照）', snapshotNo: '快照号：SNAP-20261018-03（术前评估快照）', hash: '内容哈希：SHA-256 c77a…0f3b', sealer: '封存人：手术麻醉科 赵***（术者）', sealTime: '封存时间：2026-10-18 08:30:00（术前签署前快照）' },
    { id: 'ESN-004', mrNo: '病历号：EMR-2026-006671（急诊抢救快照）', snapshotNo: '快照号：SNAP-20261017-04（抢救记录快照）', hash: '内容哈希：SHA-256 9d02…6c4e', sealer: '封存人：急诊科 周***（抢救记录负责人）', sealTime: '封存时间：2026-10-17 23:50:00（抢救结束即封存）' },
    { id: 'ESN-005', mrNo: '病历号：EMR-2026-007820（产后 42 天快照）', snapshotNo: '快照号：SNAP-20261020-05（产后随访快照）', hash: '内容哈希：SHA-256 3e8f…b19a', sealer: '封存人：产科 周***（随访负责人）', sealTime: '封存时间：2026-10-20 12:00:00（随访节点快照）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/audit-export - 审计导出（导出号/范围/操作人/导出时间/文件状态）5 条 */
async function handleEmrAuditExport(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EAE-001', exportNo: '导出号：AUD-EXP-20261020-01（科室病历导出）', scope: '范围：心内科 2026 年 9 月出院病历（共 42 份）', operator: '操作人：病案室 郑***（ARC-018，审批已通过）', exportTime: '导出时间：2026-10-20 09:15:30', fileStatus: '文件状态：已生成（PDF 打包，含水印与导出留痕）' },
    { id: 'EAE-002', exportNo: '导出号：AUD-EXP-20261019-02（DRG 病组核查导出）', scope: '范围：普外科 DRG 病组对照病历（共 18 份）', operator: '操作人：医保办 周***（AUD-002）', exportTime: '导出时间：2026-10-19 15:40:12', fileStatus: '文件状态：已生成（Excel+PDF，限定期限内查阅）' },
    { id: 'EAE-003', exportNo: '导出号：AUD-EXP-20261019-03（医疗纠纷举证导出）', scope: '范围：涉纠纷患者完整病历（含修改痕迹与快照）', operator: '操作人：医务科 王***（法务协同，双人审批）', exportTime: '导出时间：2026-10-19 11:22:48', fileStatus: '文件状态：已封存（只读归档，禁止二次编辑）' },
    { id: 'EAE-004', exportNo: '导出号：AUD-EXP-20261018-04（教学病例导出）', scope: '范围：精选教学病例 6 份（脱敏后导出）', operator: '操作人：教学办 孙***（脱敏审核通过）', exportTime: '导出时间：2026-10-18 16:05:33', fileStatus: '文件状态：已生成（脱敏版，仅供教学）' },
    { id: 'EAE-005', exportNo: '导出号：AUD-EXP-20261017-05（个人病历复印申请导出）', scope: '范围：患者本人申请复印的本人病历（核对身份后）', operator: '操作人：病案室 吴***（ARC-011）', exportTime: '导出时间：2026-10-17 10:30:20', fileStatus: '文件状态：待领取（已生成待患者签收）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/version-policy - 版本策略（病历类型/保留年限/不可篡改项/启用状态）5 条 */
async function handleEmrVersionPolicy(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'EVP-001', recordType: '病历类型：住院病历（出院记录/病程/手术记录）', retention: '保留年限：门诊≥15 年、住院≥30 年（按国家病历管理规定）', immutable: '不可篡改项：出院诊断、签名、封存快照哈希', enabled: '启用状态：已启用（强制版本留痕，禁止物理删除）' },
    { id: 'EVP-002', recordType: '病历类型：门诊病历（处方/门诊日志）', retention: '保留年限：≥15 年', immutable: '不可篡改项：处方签名、就诊时间戳', enabled: '启用状态：已启用' },
    { id: 'EVP-003', recordType: '病历类型：急诊抢救记录（含抢救时间线）', retention: '保留年限：≥30 年（抢救记录重点留存）', immutable: '不可篡改项：抢救时间线、用药记录、封存快照', enabled: '启用状态：已启用（抢救记录即写即封）' },
    { id: 'EVP-004', recordType: '病历类型：护理记录（体温单/护理评估）', retention: '保留年限：≥15 年', immutable: '不可篡改项：护理签名、生命体征时间序列', enabled: '启用状态：已启用' },
    { id: 'EVP-005', recordType: '病历类型：检验检查报告（LIS/PACS 报告）', retention: '保留年限：≥15 年（报告原件长期留存）', immutable: '不可篡改项：报告签发时间、审核签名、原始报告', enabled: '启用状态：已启用（报告只追加不改写）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/emr/lock-warnings - 锁冲突提示（病历号/占用医生/锁定截止/等待人/提示）5 条 */
async function handleEmrLockWarnings(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'ELW-001', mrNo: '病历号：EMR-2026-001188（冠心病出院记录）', holder: '占用医生：王*** 主任医师（正在上级审改）', lockUntil: '锁定截止：2026-10-20 11:30（当前会话锁）', waiter: '等待人：李*** 主治医师（等待编辑权限释放）', tip: '提示：病历正在被上级医师审改，请稍后重试或申请只读查看' },
    { id: 'ELW-002', mrNo: '病历号：EMR-2026-004512（膝关节置换手术记录）', holder: '占用医生：赵*** 主任医师（术者补记切口）', lockUntil: '锁定截止：2026-10-20 10:15', waiter: '等待人：孙*** 主治医师（待补记查房记录）', tip: '提示：手术记录锁定中，请勿并发编辑，避免版本冲突' },
    { id: 'ELW-003', mrNo: '病历号：EMR-2026-002340（糖尿病病程记录）', holder: '占用医生：刘*** 主治医师（正在更正血糖记录）', lockUntil: '锁定截止：2026-10-20 09:50', waiter: '等待人：陈*** 住院医师（等待开医嘱）', tip: '提示：该病历已被占用，系统已排队等待，释放后自动通知' },
    { id: 'ELW-004', mrNo: '病历号：EMR-2026-006671（阑尾炎入院记录）', holder: '占用医生：孙*** 主治医师（补充既往史）', lockUntil: '锁定截止：2026-10-18 15:00（会话已超时待释放）', waiter: '等待人：周*** 住院医师（等待书写病程）', tip: '提示：原会话疑似超时未释放，可申请强制释放（需审批）' },
    { id: 'ELW-005', mrNo: '病历号：EMR-2026-007820（顺产分娩记录）', holder: '占用医生：周*** 副主任医师（复核 Apgar 评分）', lockUntil: '锁定截止：2026-10-20 12:30', waiter: '等待人：赵*** 助产士（等待录入新生儿记录）', tip: '提示：病历锁定中，建议错峰编辑，避免覆盖他人修改' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m448Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/emr/change-trail', handle: handleEmrChangeTrail, auth: true },
  { method: 'GET', path: '/api/v1/emr/snapshots', handle: handleEmrSnapshots, auth: true },
  { method: 'GET', path: '/api/v1/emr/audit-export', handle: handleEmrAuditExport, auth: true },
  { method: 'GET', path: '/api/v1/emr/version-policy', handle: handleEmrVersionPolicy, auth: true },
  { method: 'GET', path: '/api/v1/emr/lock-warnings', handle: handleEmrLockWarnings, auth: true },
];
