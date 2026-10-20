/**
 * 健澜科技 jlmedaios - M433 智慧服务三级深度打磨（service）
 *
 * 在线预约挂号/检验检查报告查询/在线缴费订单/智能导诊记录/出院随访任务
 * （satisfaction 满意度评价已存在，此处不重复）
 * DEMO_MODE 下返回 mock 数据。对标智慧服务三级评审。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/service/appointments-online - 在线预约挂号（预约号/患者/科室/医生/时段/状态）5 条 */
async function handleSvcAppointmentsOnline(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SAO-001', apptNo: '预约号：APT-20261020-001（微信公众号预约）', patient: '患者：张***（男，65 岁，手机端实名）', dept: '科室：心血管内科（专家门诊）', doctor: '医生：王*** 主任医师', slot: '时段：2026-10-21 上午 09:00-09:30 第 3 号', status: '状态：已预约（已发就诊提醒短信，到院扫码取号）' },
    { id: 'SAO-002', apptNo: '预约号：APT-20261020-002（支付宝小程序预约）', patient: '患者：李***（女，58 岁）', dept: '科室：内分泌科（普通门诊）', doctor: '医生：刘*** 主治医师', slot: '时段：2026-10-21 下午 14:00-14:30 第 7 号', status: '状态：已预约' },
    { id: 'SAO-003', apptNo: '预约号：APT-20261020-003（院内自助机预约）', patient: '患者：王***（男，72 岁，家属代约）', dept: '科室：骨科（专家门诊）', doctor: '医生：赵*** 主任医师', slot: '时段：2026-10-22 上午 10:00-10:30 第 2 号', status: '状态：已到院签到（候诊中）' },
    { id: 'SAO-004', apptNo: '预约号：APT-20261020-004（微信公众号预约，已取消）', patient: '患者：赵***（女，32 岁）', dept: '科室：妇产科（普通门诊）', doctor: '医生：孙*** 主治医师', slot: '时段：2026-10-21 上午（原约第 5 号）', status: '状态：已取消（患者提前 2 小时线上取消，号源已释放）' },
    { id: 'SAO-005', apptNo: '预约号：APT-20261020-005（互联网医院复诊预约）', patient: '患者：陈***（男，45 岁，慢病随访）', dept: '科室：心内科（线上复诊）', doctor: '医生：王*** 主任医师', slot: '时段：2026-10-23 晚间 19:00-19:15 视频号', status: '状态：已预约（视频问诊链接已推送）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/service/reports-query - 检验检查报告查询（报告号/类型/患者/出具时间/已读）5 条 */
async function handleSvcReportsQuery(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SRQ-001', reportNo: '报告号：RPT-LAB-20261020-0118（血常规）', type: '类型：检验报告（LIS）', patient: '患者：张***（男，65 岁）', issueTime: '出具时间：2026-10-20 09:40:12', readStatus: '已读：患者端已查看（09:55 打开，含异常值解读链接）' },
    { id: 'SRQ-002', reportNo: '报告号：RPT-PACS-20261020-0056（胸部 CT）', type: '类型：检查报告（PACS 影像）', patient: '患者：李***（女，58 岁）', issueTime: '出具时间：2026-10-20 11:15:48', readStatus: '已读：患者端已查看（影像云胶片可在线调阅）' },
    { id: 'SRQ-003', reportNo: '报告号：RPT-LAB-20261020-0119（生化全套）', type: '类型：检验报告（LIS）', patient: '患者：王***（男，72 岁）', issueTime: '出具时间：2026-10-20 10:05:30', readStatus: '已读：未读（推送提醒已发，待患者查看）' },
    { id: 'SRQ-004', reportNo: '报告号：RPT-PATH-20261019-0023（病理报告）', type: '类型：病理报告（需医生解读）', patient: '患者：陈***（男，45 岁）', issueTime: '出具时间：2026-10-19 16:40:00', readStatus: '已读：患者端已查看，已同步主诊医生并附复诊建议' },
    { id: 'SRQ-005', reportNo: '报告号：RPT-LAB-20261020-0120（尿常规+便常规）', type: '类型：检验报告（LIS，组合项）', patient: '患者：赵***（女，32 岁）', issueTime: '出具时间：2026-10-20 09:20:55', readStatus: '已读：患者端已查看（全部正常，无异常提示）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/service/payments-online - 在线缴费订单（订单号/患者/金额/支付渠道/状态）5 条 */
async function handleSvcPaymentsOnline(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SPO-001', orderNo: '订单号：PAY-20261020-0801（门诊缴费）', patient: '患者：张***（男，65 岁）', amount: '金额：186.50 元（挂号 25 + 检查 161.50）', channel: '支付渠道：微信支付（医保个人账户）', status: '状态：支付成功（已入账，电子票据已推送）' },
    { id: 'SPO-002', orderNo: '订单号：PAY-20261020-0802（住院押金）', patient: '患者：陈***（男，45 岁）', amount: '金额：5000.00 元（住院预缴金）', channel: '支付渠道：支付宝（绑定银行卡）', status: '状态：支付成功（押金已入病区账户）' },
    { id: 'SPO-003', orderNo: '订单号：PAY-20261020-0803（检查缴费）', patient: '患者：李***（女，58 岁）', amount: '金额：275.00 元（心脏超声）', channel: '支付渠道：微信支付（自费）', status: '状态：待支付（15 分钟超时未付将自动关闭）' },
    { id: 'SPO-004', orderNo: '订单号：PAY-20261019-0777（已退款订单）', patient: '患者：赵***（女，32 岁）', amount: '金额：20.00 元（已取消挂号）', channel: '支付渠道：微信支付', status: '状态：已退款（原路退回，T+1 到账）' },
    { id: 'SPO-005', orderNo: '订单号：PAY-20261020-0804（药费缴费）', patient: '患者：王***（男，72 岁）', amount: '金额：171.50 元（药品费）', channel: '支付渠道：医保移动支付（统筹+个账组合）', status: '状态：支付成功（已结算，取药码已生成）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/service/guide - 智能导诊记录（用户主诉/推荐科室/匹配度/导诊时间）5 条 */
async function handleSvcGuide(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SGD-001', complaint: '用户主诉：“胸口闷、活动后心慌一周，伴高血压史”', recommendDept: '推荐科室：心血管内科（首选），备选急诊（若胸痛持续）', matchScore: '匹配度：94.0%（症状与科室知识库向量匹配）', guideTime: '导诊时间：2026-10-20 08:50:14（AI 导诊，2 轮追问后给出建议）' },
    { id: 'SGD-002', complaint: '用户主诉：“孩子反复咳嗽 3 天，低烧 37.8℃”', recommendDept: '推荐科室：儿科（首选），提示体温≥38.5℃ 及时退热处理', matchScore: '匹配度：91.5%', guideTime: '导诊时间：2026-10-20 09:12:40' },
    { id: 'SGD-003', complaint: '用户主诉：“右侧膝关节疼痛，上下楼梯加重半个月”', recommendDept: '推荐科室：骨科（关节外科方向），备选康复医学科', matchScore: '匹配度：89.0%', guideTime: '导诊时间：2026-10-20 10:05:22' },
    { id: 'SGD-004', complaint: '用户主诉：“多饮多尿、体重下降 1 个月”', recommendDept: '推荐科室：内分泌科（筛查 2 型糖尿病）', matchScore: '匹配度：93.2%', guideTime: '导诊时间：2026-10-20 10:48:09' },
    { id: 'SGD-005', complaint: '用户主诉：“突发剧烈头痛伴呕吐（急症）”', recommendDept: '推荐科室：直接急诊/120 提示（AI 识别为红旗症状，不引导普通门诊）', matchScore: '匹配度：急症识别命中（红旗规则）', guideTime: '导诊时间：2026-10-20 11:20:31（已推送急诊绿色通道指引）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/service/followups - 出院随访任务（患者/随访方式/计划时间/完成状态/结果）5 条 */
async function handleSvcFollowups(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'SFU-001', patient: '患者：张***（冠心病 PCI 术后出院第 7 天）', method: '随访方式：电话随访（管床护士）', planTime: '计划时间：2026-10-21 上午（出院后 7 天）', finishStatus: '完成状态：待执行（已排入随访工单）', result: '结果：待回填（了解服药依从性、伤口、有无胸闷）' },
    { id: 'SFU-002', patient: '患者：李***（糖尿病出院第 14 天）', method: '随访方式：互联网医院图文随访 + 血糖上报', planTime: '计划时间：2026-10-19（已到计划日）', finishStatus: '完成状态：已完成', result: '结果：空腹血糖 7.2mmol/L，依从性好，维持原方案' },
    { id: 'SFU-003', patient: '患者：王***（骨科关节置换术后第 30 天）', method: '随访方式：门诊复诊随访 + 功能锻炼评估', planTime: '计划时间：2026-10-25（术后 1 个月）', finishStatus: '完成状态：待执行（已预约复诊号）', result: '结果：待回填（评估关节活动度与康复进度）' },
    { id: 'SFU-004', patient: '患者：陈***（普外科术后第 7 天）', method: '随访方式：微信随访群（护士+家属）', planTime: '计划时间：2026-10-18（已完成）', finishStatus: '完成状态：已完成', result: '结果：切口愈合良好，无感染，饮食排便正常' },
    { id: 'SFU-005', patient: '患者：赵***（产科产后 42 天回访）', method: '随访方式：线上问卷 + 儿保联动', planTime: '计划时间：2026-10-30（产后 42 天）', finishStatus: '完成状态：待执行', result: '结果：待回填（产妇恢复、母乳喂养、新生儿发育）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m433Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/service/appointments-online', handle: handleSvcAppointmentsOnline, auth: true },
  { method: 'GET', path: '/api/v1/service/reports-query', handle: handleSvcReportsQuery, auth: true },
  { method: 'GET', path: '/api/v1/service/payments-online', handle: handleSvcPaymentsOnline, auth: true },
  { method: 'GET', path: '/api/v1/service/guide', handle: handleSvcGuide, auth: true },
  { method: 'GET', path: '/api/v1/service/followups', handle: handleSvcFollowups, auth: true },
];
