/**
 * 健澜科技 jlmedaios - M407 P1 业务扩展：工作流任务调度深度打磨（详情版）
 *
 * 任务列表详情/工作流模板详情/工作流实例详情/审批流程详情/任务调度详情/工作流通知详情
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/workflow/tasks-detail - 任务列表详情 5 条 */
async function handleWorkflowTasksDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WTD-001', taskName: 'Task-001：病历质控审核任务', taskType: '任务类型：病历质控（质控科）', steps: '步骤：1. 接收待质控病历（系统自动分配）；2. 检查病历完整性（入院记录、病程记录、手术记录等）；3. 发现问题，填写质控意见；4. 退回经治医生修改；5. 复查修改后的病历', handler: '处理人：质控科医生赵***（副主任医师）', status: '状态：进行中（已处理 3 份病历，剩余 2 份）' },
    { id: 'WTD-002', taskName: 'Task-002：医保申报审核任务', taskType: '任务类型：医保审核（医保科）', steps: '步骤：1. 接收待审核医保申报（系统自动分配）；2. 检查费用合理性（检查费、药品费是否与病情相符）；3. 检查报销比例（是否按规定比例报销）；4. 填写审核意见；5. 通过/退回申报', handler: '处理人：医保科医生钱***（主治医师）', status: '状态：待处理（待审核 5 份申报）' },
    { id: 'WTD-003', taskName: 'Task-003：手术安排任务', taskType: '任务类型：手术安排（手术室）', steps: '步骤：1. 接收手术申请（经治医生提交）；2. 协调手术间（根据手术类型、时间安排手术间）；3. 协调麻醉师（根据手术麻醉方式安排麻醉师）；4. 通知患者术前注意事项；5. 手术当天准备手术间', handler: '处理人：手术室护士长孙***（主管护师）', status: '状态：进行中（已安排 3 台手术，剩余 2 台）' },
    { id: 'WTD-004', taskName: 'Task-004：药品采购任务', taskType: '任务类型：药品采购（药剂科）', steps: '步骤：1. 接收药品库存预警（系统自动触发）；2. 检查药品库存（低于安全库存的药品）；3. 制定采购计划（根据库存、用量、采购周期）；4. 提交采购申请（药剂科主任审批）；5. 执行采购（向供应商下单）', handler: '处理人：药剂科药师周***（主管药师）', status: '状态：已完成（本月采购计划已执行）' },
    { id: 'WTD-005', taskName: 'Task-005：设备维护任务', taskType: '任务类型：设备维护（设备科）', steps: '步骤：1. 接收设备维护计划（系统自动生成）；2. 检查设备状态（根据维护计划检查设备）；3. 执行维护（清洁、校准、更换零部件）；4. 记录维护结果；5. 设备恢复使用', handler: '处理人：设备科工程师吴***（工程师）', status: '状态：进行中（本月计划维护 10 台设备，已完成 6 台）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/templates-detail - 工作流模板详情 5 条 */
async function handleWorkflowTemplatesDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WTplD-001', templateName: 'Tpl-001：病历质控工作流模板', stepDetails: '步骤明细：1. 节点 1：病历提交（经治医生提交病历）；2. 节点 2：质控分配（系统自动分配给质控医生）；3. 节点 3：质控审核（质控医生检查病历）；4. 节点 4：退回修改（如有问题，退回经治医生修改）；5. 节点 5：复查通过（修改后的病历复查通过）；6. 节点 6：病历归档（质控通过的病历归档）', nodeConfig: '节点配置：1. 节点 1：提交时限 24 小时；2. 节点 2：分配时限 1 小时；3. 节点 3：审核时限 48 小时；4. 节点 4：修改时限 24 小时；5. 节点 5：复查时限 24 小时；6. 节点 6：归档时限 7 个工作日', status: '状态：启用中', version: '版本：v2.0（2026-01-01 更新）' },
    { id: 'WTplD-002', templateName: 'Tpl-002：医保申报工作流模板', stepDetails: '步骤明细：1. 节点 1：费用提交（收费处提交费用明细）；2. 节点 2：医保分配（系统自动分配给医保审核员）；3. 节点 3：医保审核（医保审核员检查费用合理性）；4. 节点 4：退回修改（如有问题，退回收费处修改）；5. 节点 5：审核通过（费用审核通过）；6. 节点 6：医保结算（医保经办机构结算）', nodeConfig: '节点配置：1. 节点 1：提交时限 24 小时；2. 节点 2：分配时限 1 小时；3. 节点 3：审核时限 72 小时；4. 节点 4：修改时限 48 小时；5. 节点 5：通过时限 24 小时；6. 节点 6：结算时限 30 天', status: '状态：启用中', version: '版本：v1.5（2026-03-01 更新）' },
    { id: 'WTplD-003', templateName: 'Tpl-003：手术安排工作流模板', stepDetails: '步骤明细：1. 节点 1：手术申请（经治医生提交手术申请）；2. 节点 2：手术审批（科主任审批手术申请）；3. 节点 3：手术间协调（手术室协调手术间）；4. 节点 4：麻醉师协调（麻醉科协调麻醉师）；5. 节点 5：术前准备（患者术前注意事项、手术间准备）；6. 节点 6：手术执行（手术当天执行）', nodeConfig: '节点配置：1. 节点 1：申请时限 72 小时（术前 3 天）；2. 节点 2：审批时限 24 小时；3. 节点 3：协调时限 24 小时；4. 节点 4：协调时限 24 小时；5. 节点 5：准备时限 12 小时；6. 节点 6：执行时限：手术当天', status: '状态：启用中', version: '版本：v1.0（2025-12-01 启用）' },
    { id: 'WTplD-004', templateName: 'Tpl-004：药品采购工作流模板', stepDetails: '步骤明细：1. 节点 1：库存预警（系统自动触发库存预警）；2. 节点 2：采购计划（药剂科制定采购计划）；3. 节点 3：采购审批（药剂科主任审批采购计划）；4. 节点 4：采购执行（向供应商下单）；5. 节点 5：药品入库（药品到货后入库验收）；6. 节点 6：库存更新（入库后更新库存）', nodeConfig: '节点配置：1. 节点 1：预警触发：库存低于安全库存；2. 节点 2：计划时限 24 小时；3. 节点 3：审批时限 24 小时；4. 节点 4：执行时限 48 小时；5. 节点 5：入库时限 7 天；6. 节点 6：更新时限：入库当天', status: '状态：启用中', version: '版本：v1.2（2026-02-01 更新）' },
    { id: 'WTplD-005', templateName: 'Tpl-005：设备维护工作流模板', stepDetails: '步骤明细：1. 节点 1：维护计划（系统自动生成月度维护计划）；2. 节点 2：维护分配（设备科分配维护任务）；3. 节点 3：设备检查（工程师检查设备状态）；4. 节点 4：维护执行（工程师执行维护）；5. 节点 5：维护记录（记录维护结果）；6. 节点 6：设备恢复（维护后设备恢复使用）', nodeConfig: '节点配置：1. 节点 1：计划生成：每月 1 日；2. 节点 2：分配时限 24 小时；3. 节点 3：检查时限 48 小时；4. 节点 4：执行时限 72 小时；5. 节点 5：记录时限 24 小时；6. 节点 6：恢复时限：维护完成当天', status: '状态：启用中', version: '版本：v1.1（2026-01-15 更新）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/instances-detail - 工作流实例详情 5 条 */
async function handleWorkflowInstancesDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WID-001', instanceNo: 'INST-2026-001（病历质控工作流实例）', templateName: '模板名：Tpl-001 病历质控工作流模板', processProgress: '流程进度：节点 1（病历提交）→ 节点 2（质控分配）→ 节点 3（质控审核）→ 节点 4（退回修改）→ 节点 5（复查通过）→ 节点 6（病历归档）；当前进度：节点 3（质控审核）已完成，正在节点 4（退回修改）', currentNode: '当前节点：节点 4（退回修改）；处理人：经治医生王***（主治医师）；处理时限：2026-10-21 24:00（24 小时内修改完成）', status: '状态：进行中（已完成 3/6 节点，剩余 3 节点）' },
    { id: 'WID-002', instanceNo: 'INST-2026-002（医保申报工作流实例）', templateName: '模板名：Tpl-002 医保申报工作流模板', processProgress: '流程进度：节点 1（费用提交）→ 节点 2（医保分配）→ 节点 3（医保审核）→ 节点 4（退回修改）→ 节点 5（审核通过）→ 节点 6（医保结算）；当前进度：节点 3（医保审核）已完成，正在节点 5（审核通过）', currentNode: '当前节点：节点 5（审核通过）；处理人：医保审核员钱***（主治医师）；处理时限：2026-10-21 24:00（24 小时内通过）', status: '状态：进行中（已完成 4/6 节点，剩余 2 节点）' },
    { id: 'WID-003', instanceNo: 'INST-2026-003（手术安排工作流实例）', templateName: '模板名：Tpl-003 手术安排工作流模板', processProgress: '流程进度：节点 1（手术申请）→ 节点 2（手术审批）→ 节点 3（手术间协调）→ 节点 4（麻醉师协调）→ 节点 5（术前准备）→ 节点 6（手术执行）；当前进度：节点 4（麻醉师协调）已完成，正在节点 5（术前准备）', currentNode: '当前节点：节点 5（术前准备）；处理人：手术室护士长孙***（主管护师）；处理时限：2026-10-21 18:00（手术当天 12 小时前完成准备）', status: '状态：进行中（已完成 4/6 节点，剩余 2 节点）' },
    { id: 'WID-004', instanceNo: 'INST-2026-004（药品采购工作流实例）', templateName: '模板名：Tpl-004 药品采购工作流模板', processProgress: '流程进度：节点 1（库存预警）→ 节点 2（采购计划）→ 节点 3（采购审批）→ 节点 4（采购执行）→ 节点 5（药品入库）→ 节点 6（库存更新）；当前进度：节点 6（库存更新）已完成', currentNode: '当前节点：无（所有节点已完成）', status: '状态：已完成（6/6 节点全部完成）' },
    { id: 'WID-005', instanceNo: 'INST-2026-005（设备维护工作流实例）', templateName: '模板名：Tpl-005 设备维护工作流模板', processProgress: '流程进度：节点 1（维护计划）→ 节点 2（维护分配）→ 节点 3（设备检查）→ 节点 4（维护执行）→ 节点 5（维护记录）→ 节点 6（设备恢复）；当前进度：节点 4（维护执行）已完成，正在节点 5（维护记录）', currentNode: '当前节点：节点 5（维护记录）；处理人：设备科工程师吴***（工程师）；处理时限：2026-10-21 24:00（24 小时内记录完成）', status: '状态：进行中（已完成 4/6 节点，剩余 2 节点）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/approval-detail - 审批流程详情 5 条 */
async function handleWorkflowApprovalDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WAD-001', approvalNo: 'APR-2026-001（手术审批流程）', approvalNode: '审批节点：节点 2：手术审批（科主任审批手术申请）', approver: '审批人：普外科主任刘***（主任医师）', opinion: '审批意见：同意手术（腹腔镜胆囊切除术）；手术指征明确，患者一般情况可耐受手术；建议：术前完善相关检查，术后预防感染', time: '审批时间：2026-10-19 14:30:00（手术申请提交后 24 小时内审批）' },
    { id: 'WAD-002', approvalNo: 'APR-2026-002（采购审批流程）', approvalNode: '审批节点：节点 3：采购审批（药剂科主任审批采购计划）', approver: '审批人：药剂科主任周***（主任药师）', opinion: '审批意见：同意采购计划（本月采购 5 种药品）；库存预警合理，采购量符合实际用量；建议：优先采购集采药品（降低成本）', time: '审批时间：2026-10-18 10:00:00（采购计划提交后 24 小时内审批）' },
    { id: 'WAD-003', approvalNo: 'APR-2026-003（请假审批流程）', approvalNode: '审批节点：节点 1：科室审批（科主任审批请假申请）→ 节点 2：人事审批（人事科审批请假申请）', approver: '审批人：1. 科室审批：心内科主任王***（主任医师）；2. 人事审批：人事科科长郑***（经济师）', opinion: '审批意见：1. 科室审批：同意请假（5 天年休假）；工作已安排同事代管；2. 人事审批：同意请假（年休假符合规定）；建议：返岗后及时销假', time: '审批时间：1. 科室审批：2026-10-17 16:00:00；2. 人事审批：2026-10-18 09:00:00' },
    { id: 'WAD-004', approvalNo: 'APR-2026-004（报销审批流程）', approvalNode: '审批节点：节点 1：科室审批（科主任审批报销申请）→ 节点 2：财务审批（财务科审批报销申请）', approver: '审批人：1. 科室审批：消化内科主任陈***（主任医师）；2. 财务审批：财务科科长孙***（会计师）', opinion: '审批意见：1. 科室审批：同意报销（学术会议差旅费 3000 元）；参会符合科室发展需要；2. 财务审批：同意报销（差旅费符合财务规定）；建议：附会议通知、发票等凭证', time: '审批时间：1. 科室审批：2026-10-16 11:00:00；2. 财务审批：2026-10-17 15:00:00' },
    { id: 'WAD-005', approvalNo: 'APR-2026-005（设备采购审批流程）', approvalNode: '审批节点：节点 1：科室审批（科主任审批设备采购申请）→ 节点 2：设备科审批（设备科审批设备采购申请）→ 节点 3：院长审批（院长审批设备采购申请）', approver: '审批人：1. 科室审批：心内科主任王***（主任医师）；2. 设备科审批：设备科科长吴***（工程师）；3. 院长审批：院长赵***（主任医师）', opinion: '审批意见：1. 科室审批：同意采购（心电图机 1 台）；现有心电图机老化，需更新；2. 设备科审批：同意采购（心电图机型号符合要求）；建议：采购集采型号（降低成本）；3. 院长审批：同意采购（心电图机 1 台，预算 5 万元）', time: '审批时间：1. 科室审批：2026-10-15 10:00:00；2. 设备科审批：2026-10-16 14:00:00；3. 院长审批：2026-10-17 09:00:00' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/scheduling-detail - 任务调度详情 5 条 */
async function handleWorkflowSchedulingDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WSD-001', taskName: 'Sched-001：每日病历质控调度', schedulingRules: '调度规则：每日上午 8:00 自动触发；分配规则：按科室分配（内科病历分给内科质控医生，外科病历分给外科质控医生）；负载均衡：每位质控医生每天最多分配 10 份病历', executionRecords: '执行记录：2026-10-20 08:00:00：自动分配 5 份病历（内科 3 份，外科 2 份）；2026-10-19 08:00:00：自动分配 8 份病历（内科 5 份，外科 3 份）', results: '结果：2026-10-20：5 份病历已分配（质控医生赵*** 3 份，钱*** 2 份）；2026-10-19：8 份病历已分配（质控医生赵*** 5 份，钱*** 3 份）', status: '状态：正常（调度规则执行正常，分配合理）' },
    { id: 'WSD-002', taskName: 'Sched-002：每周药品库存盘点调度', schedulingRules: '调度规则：每周一上午 9:00 自动触发；盘点范围：所有药品库存（高值药品、常规药品）；盘点方式：系统自动生成盘点表，药剂科药师实地盘点', executionRecords: '执行记录：2026-10-20 09:00:00：自动生成盘点表（高值药品 50 种，常规药品 200 种）；2026-10-13 09:00:00：自动生成盘点表（高值药品 50 种，常规药品 200 种）', results: '结果：2026-10-20：盘点表已生成（药剂科药师周***实地盘点中）；2026-10-13：盘点完成（账实相符，无差异）', status: '状态：正常（调度规则执行正常，盘点准确）' },
    { id: 'WSD-003', taskName: 'Sched-003：每月设备维护调度', schedulingRules: '调度规则：每月 1 日上午 10:00 自动触发；维护范围：所有医疗设备（大型设备、小型设备）；维护方式：系统自动生成月度维护计划，设备科工程师执行维护', executionRecords: '执行记录：2026-10-01 10:00:00：自动生成月度维护计划（大型设备 10 台，小型设备 50 台）；2026-09-01 10:00:00：自动生成月度维护计划（大型设备 10 台，小型设备 50 台）', results: '结果：2026-10-01：维护计划已生成（设备科工程师吴***执行维护中，已完成 6/10 台大型设备）；2026-09-01：维护完成（所有设备维护完成，运行正常）', status: '状态：正常（调度规则执行正常，维护及时）' },
    { id: 'WSD-004', taskName: 'Sched-004：每季度医保申报审核调度', schedulingRules: '调度规则：每季度末月 25 日上午 11:00 自动触发；审核范围：本季度所有医保申报（住院费用、门诊费用）；审核方式：系统自动分配给医保审核员，审核员逐份审核', executionRecords: '执行记录：2026-09-25 11:00:00：自动分配本季度医保申报 100 份（住院 50 份，门诊 50 份）；2026-06-25 11:00:00：自动分配本季度医保申报 90 份（住院 40 份，门诊 50 份）', results: '结果：2026-09-25：100 份申报已分配（医保审核员钱*** 50 份，孙*** 50 份）；2026-06-25：90 份申报已分配（医保审核员钱*** 45 份，孙*** 45 份）', status: '状态：正常（调度规则执行正常，分配合理）' },
    { id: 'WSD-005', taskName: 'Sched-005：每年设备校准调度', schedulingRules: '调度规则：每年 1 月 1 日上午 14:00 自动触发；校准范围：所有计量设备（血压计、心电图机、超声设备等）；校准方式：系统自动生成年度校准计划，设备科联系计量院校准', executionRecords: '执行记录：2026-01-01 14:00:00：自动生成年度校准计划（计量设备 100 台）；2025-01-01 14:00:00：自动生成年度校准计划（计量设备 100 台）', results: '结果：2026-01-01：校准计划已生成（设备科工程师吴***联系计量院，已完成校准 50/100 台）；2025-01-01：校准完成（所有设备校准完成，合格证已粘贴）', status: '状态：正常（调度规则执行正常，校准及时）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/workflow/notifications-detail - 工作流通知详情 5 条 */
async function handleWorkflowNotificationsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'WND-001', notificationNo: 'NTF-2026-001（病历质控通知）', notificationContent: '通知内容：您有 1 份新的病历质控任务（EMR-2026-001，患者张***）；请在 48 小时内完成质控审核', recipient: '接收人：质控医生赵***（副主任医师）', readStatus: '已读状态：已读（2026-10-20 08:30:00 已读）', time: '通知时间：2026-10-20 08:00:00（系统自动通知）' },
    { id: 'WND-002', notificationNo: 'NTF-2026-002（手术安排通知）', notificationContent: '通知内容：您有 1 台新的手术安排（SUR-2026-002，患者李***，腹腔镜胆囊切除术）；请在术前 1 天完成术前准备', recipient: '接收人：麻醉师李***（主治医师）', readStatus: '已读状态：已读（2026-10-19 15:00:00 已读）', time: '通知时间：2026-10-19 14:00:00（系统自动通知）' },
    { id: 'WND-003', notificationNo: 'NTF-2026-003（药品采购通知）', notificationContent: '通知内容：您有 1 个新的药品采购任务（阿托伐他汀钙片，库存低于安全库存）；请在 24 小时内制定采购计划', recipient: '接收人：药师周***（主管药师）', readStatus: '已读状态：已读（2026-10-18 10:30:00 已读）', time: '通知时间：2026-10-18 10:00:00（系统自动通知）' },
    { id: 'WND-004', notificationNo: 'NTF-2026-004（设备维护通知）', notificationContent: '通知内容：您有 1 个新的设备维护任务（心电图机，本月计划维护）；请在 72 小时内完成设备检查', recipient: '接收人：工程师吴***（工程师）', readStatus: '已读状态：未读（尚未读）', time: '通知时间：2026-10-20 14:00:00（系统自动通知）' },
    { id: 'WND-005', notificationNo: 'NTF-2026-005（审批结果通知）', notificationContent: '通知内容：您的报销申请（学术会议差旅费 3000 元）已审批通过；请在 7 天内到财务科领取报销款', recipient: '接收人：医生陈***（主任医师）', readStatus: '已读状态：已读（2026-10-17 16:00:00 已读）', time: '通知时间：2026-10-17 15:30:00（系统自动通知）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m407Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/workflow/tasks-detail', handle: handleWorkflowTasksDetail, auth: true },
  { method: 'GET', path: '/api/v1/workflow/templates-detail', handle: handleWorkflowTemplatesDetail, auth: true },
  { method: 'GET', path: '/api/v1/workflow/instances-detail', handle: handleWorkflowInstancesDetail, auth: true },
  { method: 'GET', path: '/api/v1/workflow/approval-detail', handle: handleWorkflowApprovalDetail, auth: true },
  { method: 'GET', path: '/api/v1/workflow/scheduling-detail', handle: handleWorkflowSchedulingDetail, auth: true },
  { method: 'GET', path: '/api/v1/workflow/notifications-detail', handle: handleWorkflowNotificationsDetail, auth: true },
];
