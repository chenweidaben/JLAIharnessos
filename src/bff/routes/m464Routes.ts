/**
 * 健澜科技 jlmedaios - M464 科研课题与成果转化（research）
 *
 * 课题经费 / 专利成果 / 成果转化 / 学术会议
 * （research/projects 课题立项、research/papers 论文成果已存在，此处不重复）。
 * 避开 M443 科研教学、M460 住培教学、M451 随访慢病口径。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/research/funding - 课题经费（课题号/预算/已支出/余额/拨付进度）5 条 */
async function handleRsFunding(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'FND-001', grantNo: '课题号：2026-ZD-01（院级重点课题）', budget: '预算：人民币 200,000.00 元（3 年周期）', spent: '已支出：人民币 86,000.00 元（耗材/检测/劳务）', balance: '余额：人民币 114,000.00 元', progress: '拨付进度：第 1 期 60% 已到账，按里程碑拨付' },
    { id: 'FND-002', grantNo: '课题号：2025-LY-08（市卫健委立项课题）', budget: '预算：人民币 80,000.00 元', spent: '已支出：人民币 62,000.00 元（结题冲刺阶段）', balance: '余额：人民币 18,000.00 元', progress: '拨付进度：80% 已到账，结题验收后拨付尾款' },
    { id: 'FND-003', grantNo: '课题号：2026-HY-12（横向合作课题）', budget: '预算：人民币 150,000.00 元（企业委托）', spent: '已支出：人民币 45,000.00 元', balance: '余额：人民币 105,000.00 元', progress: '拨付进度：合同首付 30% 到账，里程碑节点拨付' },
    { id: 'FND-004', grantNo: '课题号：2025-ZR-03（省自然基金青年项目）', budget: '预算：人民币 100,000.00 元', spent: '已支出：人民币 71,500.00 元', balance: '余额：人民币 28,500.00 元', progress: '拨付进度：年度拨付完成，中期检查已通过' },
    { id: 'FND-005', grantNo: '课题号：2026-PS-05（院级一般课题）', budget: '预算：人民币 30,000.00 元', spent: '已支出：人民币 8,200.00 元（启动阶段）', balance: '余额：人民币 21,800.00 元', progress: '拨付进度：50% 启动经费到账' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/research/patents - 专利成果（专利号/名称/类型/发明人/状态）5 条 */
async function handleRsPatents(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'PAT-001', patentNo: '专利号：ZL 2024 1 0xxxxx.1', name: '名称：一种面向慢病随访的智能用药提醒装置及方法', type: '类型：发明专利（已授权）', inventor: '发明人：课题组 王***（第一发明人）+ 团队', status: '状态：已授权（专利权人：本院/合作单位）' },
    { id: 'PAT-002', patentNo: '专利号：ZL 2025 2 0xxxxx.7', name: '名称：一种可调节角度的临床检查辅助托架', type: '类型：实用新型专利（已授权）', inventor: '发明人：李*** + 设备科团队', status: '状态：已授权' },
    { id: 'PAT-003', patentNo: '申请号：2026 1 0xxxxx.3（未授权）', name: '名称：基于语音交互的老年患者问诊辅助系统', type: '类型：发明专利（实质审查中）', inventor: '发明人：陈***（第一发明人）+ 健澜研发团队', status: '状态：审查中（已答复首次审查意见）' },
    { id: 'PAT-004', patentNo: '专利号：ZL 2025 3 0xxxxx.2', name: '名称：医疗随访终端外观设计（界面/壳体）', type: '类型：外观设计专利（已授权）', inventor: '发明人：设计团队 林***', status: '状态：已授权' },
    { id: 'PAT-005', patentNo: '申请号：2026 2 0xxxxx.9（未授权）', name: '名称：一种床旁呼叫与护理联动转接装置', type: '类型：实用新型专利（受理中）', inventor: '发明人：护理团队 孙*** + 工程师', status: '状态：受理（初审阶段）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/research/transfer - 成果转化（成果/受让方/合同额/到账/状态）5 条 */
async function handleRsTransfer(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TRF-001', result: '成果：慢病智能随访用药提醒专利（ZL 2024...1）', buyer: '受让方：本地医疗器械企业（独家许可）', amount: '合同额：人民币 180,000.00 元（许可 5 年）', received: '到账：人民币 126,000.00 元（70% 首付）', status: '状态：履行中（尾款按年度里程碑支付）' },
    { id: 'TRF-002', result: '成果：临床检查辅助托架实用新型（ZL 2025...7）', buyer: '受让方：器械制造公司（普通许可，多家）', amount: '合同额：人民币 60,000.00 元/家', received: '到账：人民币 60,000.00 元（首家全款）', status: '状态：已结算（第二家洽谈中）' },
    { id: 'TRF-003', result: '成果：老年问诊辅助系统软件著作权（非专利）', buyer: '受让方：互联网医院合作平台', amount: '合同额：人民币 250,000.00 元（技术许可）', received: '到账：人民币 100,000.00 元（40% 里程碑）', status: '状态：对接中（技术交付验收）' },
    { id: 'TRF-004', result: '成果：床旁呼叫联动转接装置实用新型（受理中）', buyer: '受让方：待对接（招标/推介会挂牌）', amount: '合同额：待定', received: '到账：0（未签约）', status: '状态：挂牌推介（待成果对接）' },
    { id: 'TRF-005', result: '成果：临床决策规则库（本院自研，内部转化）', buyer: '受让方：本院自研系统（内部成果应用）', amount: '合同额：内部计价（不计对外交易）', received: '到账：内部核算', status: '状态：已内部落地（嵌入 CDS 模块）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/research/conferences - 学术会议（会议名/主办/参会人/报告/时间）5 条 */
async function handleRsConferences(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'CNF-001', name: '会议名：2026 华东心血管病学术年会（市级分会场）', host: '主办：市医学会心血管分会', attendee: '参会人：心内科 王***（团队 4 人）', report: '报告：口头报告《本院心衰规范化管理实践》', time: '时间：2026-09-18 至 09-20（已参加）' },
    { id: 'CNF-002', name: '会议名：2026 智慧医院与 AI 医疗创新论坛', host: '主办：省卫生信息学会', attendee: '参会人：信息科 + 研发团队（6 人）', report: '报告：壁报展示《JLMedAIOS 智能体平台实践》', time: '时间：2026-10-12（已参加）' },
    { id: 'CNF-003', name: '会议名：省内分泌年会（2026）', host: '主办：省医学会内分泌学分会', attendee: '参会人：内分泌科 刘***', report: '报告：分会场交流《2 型糖尿病院内血糖管理质控》', time: '时间：2026-08-22 至 08-24（已参加）' },
    { id: 'CNF-004', name: '会议名：全国护理管理创新大会（线上+线下）', host: '主办：省护理学会选送，全国护理学会', attendee: '参会人：护理部 林***', report: '报告：优秀论文交流《移动护理闭环质控实践》', time: '时间：2026-11-08（拟参加，已投稿待确认）' },
    { id: 'CNF-005', name: '会议名：2026 院感防控与抗菌管理学术研讨会', host: '主办：省院感质控中心', attendee: '参会人：院感科 吴***（团队 3 人）', report: '报告：参会学习（无大会报告，主题分会场）', time: '时间：2026-10-28（计划参加，报名中）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m464Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/research/funding', handle: handleRsFunding, auth: true },
  { method: 'GET', path: '/api/v1/research/patents', handle: handleRsPatents, auth: true },
  { method: 'GET', path: '/api/v1/research/transfer', handle: handleRsTransfer, auth: true },
  { method: 'GET', path: '/api/v1/research/conferences', handle: handleRsConferences, auth: true },
];
