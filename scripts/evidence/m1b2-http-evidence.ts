/**
 * 健澜科技 jlmedaios - M1-B2 在院诊疗三站 真实 HTTP 取证脚本
 *
 * 对运行中的真实模式 BFF（PostgreSQL 5433，DEMO_MODE=0）发起真实请求：
 *  - 医生查房：新建→本人签名→上级(第二医师)审签 / 退回；自审 403、缺因 400；
 *  - 护士护理：护理记录新建→本人签名（他人代签 403）；护理任务新建（幂等键重复 409）
 *      →执行（并发双发仅一条成功，重复执行幂等返回）；
 *  - 在院医嘱：长期/临时开具→审核（重复审核 409）→执行（并发同槽仅一条、同槽幂等）
 *      →高风险药双人核对强制→停止（停止后执行/再停止 409）；驳回；
 *  - 职责分离 403、跨科越权 403、未认证 401。
 *
 * 运行： bun scripts/evidence/m1b2-http-evidence.ts [baseURL] [visitId]
 * 退出码：任一断言失败 → 1。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

const BASE = process.argv[2] ?? 'http://127.0.0.1:8090';
const VISIT =
  process.argv[3] ?? 'a573a786-0767-480f-a168-8f3a44a72188';

interface Resp {
  status: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any;
}

async function call(
  token: string | null,
  method: string,
  path: string,
  body?: unknown,
): Promise<Resp> {
  const res = await fetch(BASE + path, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let parsed: unknown = null;
  const text = await res.text();
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = text;
  }
  return { status: res.status, body: parsed };
}

async function login(username: string): Promise<{ token: string; id: string }> {
  const r = await call(null, 'POST', '/api/v1/auth/login', {
    username,
    password: 'evidence',
  });
  if (r.status !== 200) throw new Error(`login ${username} failed: ${r.status}`);
  return { token: r.body.data.tokens.accessToken, id: r.body.data.user.id };
}

let pass = 0;
let failN = 0;
const failures: string[] = [];
function check(name: string, cond: boolean, detail = ''): void {
  if (cond) {
    pass++;
    console.log(`  PASS  ${name}${detail ? `  (${detail})` : ''}`);
  } else {
    failN++;
    failures.push(name);
    console.log(`  FAIL  ${name}  ${detail}`);
  }
}
const codeOk = (r: Resp, c: number) => r.status === c;
const data = (r: Resp) => r.body?.data;

async function main(): Promise<void> {
  console.log(`== M1-B2 HTTP evidence  base=${BASE} visit=${VISIT} ==`);
  const doc = await login('doctor_chen');
  const doc2 = await login('doctor_zhou');
  const nurse = await login('nurse_zhao');
  const nurse2 = await login('nurse_qian');
  const outsider = await login('nurse_sun'); // 呼吸内科
  const ts = Date.now();

  /* ------------------------------- 医生查房 ------------------------------ */
  console.log('-- 医生查房 --');
  let r = await call(doc.token, 'GET', `/api/v1/inpatient/rounds?visitId=${VISIT}`);
  check('查房列表可查', codeOk(r, 200), `n=${data(r)?.length}`);

  r = await call(doc.token, 'POST', '/api/v1/inpatient/rounds', {
    visitId: VISIT,
    roundType: 'routine',
    isSuperior: false,
    assessment: '神清，生命体征平稳，继续当前治疗',
    planAdjustment: '维持原方案，观察病情变化',
  });
  check('新建普通查房(draft)', codeOk(r, 200) && data(r)?.status === 'draft', data(r)?.status);
  const r1 = data(r)?.id;

  r = await call(doc.token, 'POST', `/api/v1/inpatient/rounds/${r1}/sign`);
  check('本人签名→signed', codeOk(r, 200) && data(r)?.status === 'signed', data(r)?.status);

  r = await call(doc.token, 'POST', '/api/v1/inpatient/rounds', {
    visitId: VISIT,
    roundType: 'superior',
    isSuperior: true,
    assessment: '上级查房：病情稳定，优化降压、抗血小板方案',
    diagnosis: '冠心病；原发性高血压',
  });
  const rs = data(r)?.id;
  r = await call(doc.token, 'POST', `/api/v1/inpatient/rounds/${rs}/sign`);
  check('上级查房本人签名', codeOk(r, 200) && data(r)?.status === 'signed', data(r)?.status);

  r = await call(doc.token, 'POST', `/api/v1/inpatient/rounds/${rs}/countersign`);
  check('创建人自审→403', codeOk(r, 403), `${r.status}`);

  r = await call(doc2.token, 'POST', `/api/v1/inpatient/rounds/${rs}/countersign`);
  check('第二医师审签→countersigned', codeOk(r, 200) && data(r)?.status === 'countersigned', data(r)?.status);

  r = await call(doc.token, 'POST', '/api/v1/inpatient/rounds', {
    visitId: VISIT, roundType: 'superior', isSuperior: true, assessment: '待退回查房记录',
  });
  const rq = data(r)?.id;
  await call(doc.token, 'POST', `/api/v1/inpatient/rounds/${rq}/sign`);
  r = await call(doc2.token, 'POST', `/api/v1/inpatient/rounds/${rq}/return`, {
    reason: '病情评估不充分，请补充查体与辅助检查',
  });
  check('上级退回→returned', codeOk(r, 200) && data(r)?.status === 'returned', data(r)?.status);

  r = await call(doc.token, 'POST', '/api/v1/inpatient/rounds', {
    visitId: VISIT, roundType: 'superior', isSuperior: true, assessment: '缺退回因用例',
  });
  const rq2 = data(r)?.id;
  await call(doc.token, 'POST', `/api/v1/inpatient/rounds/${rq2}/sign`);
  r = await call(doc2.token, 'POST', `/api/v1/inpatient/rounds/${rq2}/return`, {});
  check('退回缺原因→400', codeOk(r, 400), `${r.status}`);

  /* ------------------------------- 护士护理 ------------------------------ */
  console.log('-- 护士护理 --');
  r = await call(nurse.token, 'GET', `/api/v1/inpatient/nursing/records?visitId=${VISIT}`);
  check('护理记录列表可查', codeOk(r, 200), `n=${data(r)?.length}`);

  r = await call(nurse.token, 'POST', '/api/v1/inpatient/nursing/records', {
    visitId: VISIT,
    nursingLevel: 'level2',
    shift: 'day',
    vitals: { temperature: 36.6, pulse: 78, respiration: 18, bp: '128/80', spo2: 98 },
    intake: { water: 1000 },
    output: { urine: 1200 },
    measures: '定时翻身拍背、健康宣教',
    pressureSoreRisk: 'low',
    fallRisk: 'low',
  });
  check('新建护理记录(draft)', codeOk(r, 200) && data(r)?.status === 'draft', data(r)?.status);
  const nr = data(r)?.id;

  r = await call(nurse.token, 'POST', `/api/v1/inpatient/nursing/records/${nr}/sign`);
  check('本人签名→signed', codeOk(r, 200) && data(r)?.status === 'signed', data(r)?.status);

  r = await call(nurse2.token, 'POST', `/api/v1/inpatient/nursing/records/${nr}/sign`);
  check('他人代签护理记录→403', codeOk(r, 403), `${r.status}`);

  r = await call(nurse.token, 'POST', '/api/v1/inpatient/nursing/tasks', {
    visitId: VISIT, taskType: 'vitals', content: '测量晨起生命体征',
    scheduledAt: '2026-09-27T06:00', idempotencyKey: `evid-task-${ts}`,
  });
  check('新建护理任务(pending)', codeOk(r, 200) && data(r)?.status === 'pending', data(r)?.status);
  const t1 = data(r)?.id;

  r = await call(nurse.token, 'POST', '/api/v1/inpatient/nursing/tasks', {
    visitId: VISIT, taskType: 'vitals', content: '重复幂等键',
    scheduledAt: '2026-09-27T06:00', idempotencyKey: `evid-task-${ts}`,
  });
  check('任务幂等键重复→409', codeOk(r, 409), `${r.status}`);

  r = await call(nurse.token, 'POST', `/api/v1/inpatient/nursing/tasks/${t1}/execute`, {
    result: 'T36.5℃ P76次/分 R17次/分 BP120/78mmHg',
  });
  check('执行任务→done', codeOk(r, 200) && data(r)?.task?.status === 'done' && data(r)?.deduplicated === false, data(r)?.task?.status);

  r = await call(nurse.token, 'POST', `/api/v1/inpatient/nursing/tasks/${t1}/execute`, {
    result: '再次执行',
  });
  check('重复执行幂等返回(dedup=true)', codeOk(r, 200) && data(r)?.deduplicated === true, `dedup=${data(r)?.deduplicated}`);

  r = await call(nurse.token, 'POST', '/api/v1/inpatient/nursing/tasks', {
    visitId: VISIT, taskType: 'turning', content: '并发执行用例任务',
    scheduledAt: '2026-09-27T08:00', idempotencyKey: `evid-task2-${ts}`,
  });
  const t2 = data(r)?.id;
  const [ea, eb] = await Promise.all([
    call(nurse.token, 'POST', `/api/v1/inpatient/nursing/tasks/${t2}/execute`, { result: '并发A' }),
    call(nurse.token, 'POST', `/api/v1/inpatient/nursing/tasks/${t2}/execute`, { result: '并发B' }),
  ]);
  const dedups = [ea.body?.data?.deduplicated, eb.body?.data?.deduplicated];
  const inserted = dedups.filter((d) => d === false).length;
  check('任务并发双发仅一条成功', ea.status === 200 && eb.status === 200 && inserted === 1, `dedups=${dedups.join(',')}`);

  r = await call(doc.token, 'POST', `/api/v1/inpatient/nursing/tasks/${t1}/execute`, { result: 'x' });
  check('医师执行护理任务→403', codeOk(r, 403), `${r.status}`);

  /* ------------------------------- 在院医嘱 ------------------------------ */
  console.log('-- 在院医嘱 --');
  r = await call(doc.token, 'GET', `/api/v1/inpatient/orders?visitId=${VISIT}`);
  check('医嘱视图可查', codeOk(r, 200) && Array.isArray(data(r)?.longTerm), `long=${data(r)?.longTerm?.length} short=${data(r)?.shortTerm?.length}`);

  r = await call(doc.token, 'POST', '/api/v1/inpatient/orders', {
    visitId: VISIT, orderType: 'drug', category: 'long_term', priority: 'routine',
    content: '阿司匹林肠溶片 100mg 口服 每日一次', requiresDoubleCheck: false,
  });
  check('开具长期医嘱(pending_review)', codeOk(r, 200) && data(r)?.status === 'pending_review', data(r)?.status);
  const oL = data(r)?.id;

  r = await call(doc2.token, 'POST', `/api/v1/inpatient/orders/${oL}/review`);
  check('第二医师审核→active', codeOk(r, 200) && data(r)?.status === 'active', data(r)?.status);

  r = await call(doc2.token, 'POST', `/api/v1/inpatient/orders/${oL}/review`);
  check('重复审核→409', codeOk(r, 409), `${r.status}`);

  const S1 = '2026-09-27T10:00';
  const S2 = '2026-09-27T11:00';
  r = await call(nurse.token, 'POST', `/api/v1/inpatient/orders/${oL}/administer`, { slot: S1, dose: '100mg' });
  check('长期医嘱执行(仍active)', codeOk(r, 200) && data(r)?.deduplicated === false && data(r)?.order?.status === 'active', data(r)?.order?.status);

  const [aa, ab] = await Promise.all([
    call(nurse.token, 'POST', `/api/v1/inpatient/orders/${oL}/administer`, { slot: S2 }),
    call(nurse.token, 'POST', `/api/v1/inpatient/orders/${oL}/administer`, { slot: S2 }),
  ]);
  const oInsert = [aa.body?.data?.deduplicated, ab.body?.data?.deduplicated].filter((d) => d === false).length;
  check('同槽并发给药仅一条', aa.status === 200 && ab.status === 200 && oInsert === 1, `inserted=${oInsert}`);

  r = await call(nurse.token, 'POST', `/api/v1/inpatient/orders/${oL}/administer`, { slot: S1 });
  check('同槽重复给药幂等(dedup=true)', codeOk(r, 200) && data(r)?.deduplicated === true, `dedup=${data(r)?.deduplicated}`);

  r = await call(doc.token, 'POST', `/api/v1/inpatient/orders/${oL}/stop`);
  check('医师停止长期医嘱→stopped', codeOk(r, 200) && data(r)?.status === 'stopped', data(r)?.status);

  r = await call(nurse.token, 'POST', `/api/v1/inpatient/orders/${oL}/administer`, { slot: '2026-09-27T12:00' });
  check('停止后给药→409', codeOk(r, 409), `${r.status}`);
  r = await call(doc.token, 'POST', `/api/v1/inpatient/orders/${oL}/stop`);
  check('重复停止→409', codeOk(r, 409), `${r.status}`);

  // 高风险药双人核对
  r = await call(doc.token, 'POST', '/api/v1/inpatient/orders', {
    visitId: VISIT, orderType: 'drug', category: 'short_term', priority: 'urgent',
    content: '肝素钠注射液 5000IU 皮下注射 即刻', requiresDoubleCheck: true,
  });
  const oD = data(r)?.id;
  await call(doc2.token, 'POST', `/api/v1/inpatient/orders/${oD}/review`);
  r = await call(nurse.token, 'POST', `/api/v1/inpatient/orders/${oD}/administer`, {});
  check('高风险药无核对人→400', codeOk(r, 400), `${r.status}`);
  r = await call(nurse.token, 'POST', `/api/v1/inpatient/orders/${oD}/administer`, { checkedBy: nurse.id });
  check('核对人=执行人→400', codeOk(r, 400), `${r.status}`);
  r = await call(nurse.token, 'POST', `/api/v1/inpatient/orders/${oD}/administer`, { checkedBy: nurse2.id });
  check('双人核对执行→临时医嘱executed', codeOk(r, 200) && data(r)?.deduplicated === false && data(r)?.order?.status === 'executed', data(r)?.order?.status);
  r = await call(nurse.token, 'POST', `/api/v1/inpatient/orders/${oD}/administer`, { checkedBy: nurse2.id });
  check('已执行临时医嘱再给药→409', codeOk(r, 409), `${r.status}`);

  // 驳回
  r = await call(doc.token, 'POST', '/api/v1/inpatient/orders', {
    visitId: VISIT, orderType: 'lab', category: 'short_term', content: '急查血常规+CRP',
  });
  const oR = data(r)?.id;
  r = await call(doc2.token, 'POST', `/api/v1/inpatient/orders/${oR}/reject`, { reason: '检验项目与昨日重复' });
  check('医师驳回→rejected', codeOk(r, 200) && data(r)?.status === 'rejected', data(r)?.status);
  r = await call(doc.token, 'POST', '/api/v1/inpatient/orders', {
    visitId: VISIT, orderType: 'lab', category: 'short_term', content: '急查电解质',
  });
  const oR2 = data(r)?.id;
  r = await call(doc2.token, 'POST', `/api/v1/inpatient/orders/${oR2}/reject`, {});
  check('驳回缺原因→400', codeOk(r, 400), `${r.status}`);

  // 临时医嘱正常执行
  r = await call(doc.token, 'POST', '/api/v1/inpatient/orders', {
    visitId: VISIT, orderType: 'drug', category: 'short_term', content: '布洛芬缓释胶囊 0.3g 口服 即刻',
  });
  const oS = data(r)?.id;
  await call(doc2.token, 'POST', `/api/v1/inpatient/orders/${oS}/review`);
  r = await call(nurse.token, 'POST', `/api/v1/inpatient/orders/${oS}/administer`, {});
  check('临时医嘱执行→executed', codeOk(r, 200) && data(r)?.order?.status === 'executed', data(r)?.order?.status);

  /* --------------------------- 职责分离 / 越权 --------------------------- */
  console.log('-- 职责分离 / 越权 / 认证 --');
  r = await call(nurse.token, 'POST', '/api/v1/inpatient/rounds', { visitId: VISIT, assessment: 'x' });
  check('护士写查房→403', codeOk(r, 403), `${r.status}`);
  r = await call(nurse.token, 'POST', '/api/v1/inpatient/orders', { visitId: VISIT, content: 'x', orderType: 'drug' });
  check('护士开医嘱→403', codeOk(r, 403), `${r.status}`);
  r = await call(nurse.token, 'POST', `/api/v1/inpatient/orders/${oL}/review`);
  check('护士审核医嘱→403', codeOk(r, 403), `${r.status}`);
  r = await call(nurse.token, 'POST', `/api/v1/inpatient/orders/${oL}/stop`);
  check('护士停止医嘱→403', codeOk(r, 403), `${r.status}`);
  r = await call(doc.token, 'POST', '/api/v1/inpatient/nursing/records', { visitId: VISIT, nursingLevel: 'level2' });
  check('医师写护理记录→403', codeOk(r, 403), `${r.status}`);
  r = await call(doc.token, 'POST', '/api/v1/inpatient/nursing/tasks', { visitId: VISIT, content: 'x', idempotencyKey: 'k' });
  check('医师建护理任务→403', codeOk(r, 403), `${r.status}`);
  r = await call(doc.token, 'POST', `/api/v1/inpatient/orders/${oL}/administer`, {});
  check('医师给药→403', codeOk(r, 403), `${r.status}`);

  r = await call(outsider.token, 'GET', `/api/v1/inpatient/orders?visitId=${VISIT}`);
  check('跨科越权访问→403', codeOk(r, 403), `${r.status}`);

  r = await call(null, 'GET', `/api/v1/inpatient/orders?visitId=${VISIT}`);
  check('未认证→401', codeOk(r, 401), `${r.status}`);

  console.log(`\n== 结果： ${pass} pass / ${failN} fail ==`);
  if (failN) {
    console.log('失败项：', failures.join('; '));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('evidence run error:', e);
  process.exit(1);
});
