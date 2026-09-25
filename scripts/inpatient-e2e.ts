/**
 * 健澜科技 jlmedaios - 住院核心事务（M1-A）真实端到端验证脚本
 *
 * 真实驱动运行中的 BFF（http://127.0.0.1:8080），全链路：
 *   登录 → 入院登记(自动分配床位) → 床位图核验 → 换床(同病区) → 转科(跨科室/病区)
 *        → 在院详情(ADT 移动史) → 出院(释放床位) → 床位释放核验
 *
 * 关键修正（discharge 返回体）：
 *   出院端点真实返回结构为 { visitId, dischargedAt, bedId }，**不含 movements 字段**。
 *   本脚本严格按此取数（用 dischargedAt/bedId 断言），ADT 移动史统一从
 *   “在院详情 GET /patients/:visitId” 的 movements 字段读取，不再假设出院响应带移动史。
 *
 * 身份分工（真实登录账号，JWT）：
 *   - doctor_chen（心血管内科 / dept）：入院 + 同病区换床；
 *   - admin（医务科 / all）：跨科转科（心血管内科 → 呼吸内科）+ 出院。
 *
 * 用法：bun run scripts/inpatient-e2e.ts   （需先启动 BFF 与 PostgreSQL）
 * 任一断言失败 → 进程以非零码退出。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

const BASE = process.env.BFF_BASE ?? 'http://127.0.0.1:8080';

/* ------------------------------ 小工具 -------------------------------- */

let failures = 0;
function assert(cond: unknown, msg: string): asserts cond {
  if (cond) {
    console.log(`  [PASS] ${msg}`);
  } else {
    failures++;
    console.error(`  [FAIL] ${msg}`);
  }
}

async function api<T = any>(
  method: string,
  path: string,
  token?: string,
  body?: unknown,
): Promise<{ status: number; data: T }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let json: any = null;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  return { status: res.status, data: json?.data ?? json };
}

async function login(username: string): Promise<string> {
  const { status, data } = await api('POST', '/api/v1/auth/login', undefined, {
    username,
    password: 'trial-build',
  });
  if (status !== 200 || !data?.tokens?.accessToken) {
    throw new Error(`登录失败 ${username}: status=${status} body=${JSON.stringify(data)}`);
  }
  return data.tokens.accessToken as string;
}

/** 从床位图读取某病区（按 code）结构化数据 */
async function wardByCode(
  token: string,
  wardCode: string,
): Promise<{
  id: string;
  code: string;
  department: string;
  beds: Array<{ id: string; bedNo: string; status: string; occupant: any }>;
}> {
  const { data } = await api('GET', '/api/v1/inpatient/bed-map', token);
  const ward = data.wards.find((w: any) => w.code === wardCode);
  if (!ward) throw new Error(`床位图未返回病区 ${wardCode}`);
  return ward;
}

function findBed(ward: any, status: string): any {
  return ward.beds.find((b: any) => b.status === status);
}

/* ------------------------------ 主流程 -------------------------------- */

async function main(): Promise<void> {
  console.log('================ jlmedaios M1-A 住院 E2E 开始 ================');
  console.log(`BFF: ${BASE}  时间: ${new Date().toISOString()}`);

  const chen = await login('doctor_chen');
  const admin = await login('admin');
  console.log('[登录] doctor_chen / admin JWT 获取成功\n');

  const runId = Date.now().toString(36);

  /* ---- 1) 入院登记（doctor_chen，心血管内科一病区，自动分配床位）---- */
  console.log('[1] 入院登记 → WARD-CARDIO-1（自动分配床位）');
  const admitBody = {
    newPatient: {
      nameMasked: `E2E患*${runId.slice(-4)}`,
      gender: '男',
      birthDate: '1980-03-12',
      bloodType: 'A',
      allergies: [{ substance: '青霉素', reaction: '皮疹', severity: 'medium' }],
      tags: ['E2E验证'],
    },
    wardId: (await wardByCode(chen, 'WARD-CARDIO-1')).id,
    diagnosis: 'E2E验证：急性冠状动脉综合征（虚构）',
    condition: 'serious',
    admissionType: 'elective',
    source: 'outpatient',
  };
  const admit = await api('POST', '/api/v1/inpatient/admissions', chen, admitBody);
  assert(admit.status === 200, `入院 HTTP 200（实际 ${admit.status}）`);
  const visitId: string = admit.data.visitId;
  const bedAId: string = admit.data.bedId;
  const bedANo: string = admit.data.bedNo;
  assert(!!visitId, `返回在院记录 visitId=${visitId}`);
  assert(!!bedAId, `自动分配到床位 ${bedANo}（bedId 非空）`);
  assert(admit.data.department === '心血管内科', `科室=心血管内科（实际 ${admit.data.department}）`);
  assert(admit.data.status === undefined || admit.data.wardId, '在院列表项含 wardId');
  console.log(`    住院号/就诊: visitId=${visitId} 初始床位=${bedANo}\n`);

  /* ---- 2) 床位图核验：床 A 占用，占用者为本患者 ---- */
  console.log('[2] 床位图核验初始床位占用');
  let cardio = await wardByCode(chen, 'WARD-CARDIO-1');
  let bedA = cardio.beds.find((b) => b.id === bedAId);
  assert(bedA?.status === 'occupied', `床位 ${bedANo} 状态=occupied`);
  assert(bedA?.occupant?.visitId === visitId, `床位 ${bedANo} 占用者 visitId 匹配`);
  assert(bedA?.occupant?.mrn?.startsWith('PAT'), `占用者 mrn=${bedA?.occupant?.mrn}`);

  /* ---- 3) 换床（同病区，doctor_chen）---- */
  console.log('[3] 换床（同病区 WARD-CARDIO-1）');
  cardio = await wardByCode(chen, 'WARD-CARDIO-1');
  const bedB = findBed(cardio, 'available');
  assert(!!bedB, '存在另一张空闲床作为换床目标');
  const change = await api(
    'POST',
    `/api/v1/inpatient/patients/${visitId}/bed-change`,
    chen,
    { targetBedId: bedB.id, reason: 'E2E 同病区换床' },
  );
  assert(change.status === 200, `换床 HTTP 200（实际 ${change.status} ${JSON.stringify(change.data).slice(0, 120)}）`);
  assert(change.data.bedId === bedB.id, `换床后 bedId=目标床 ${bedB.bedNo}`);
  assert(change.data.bedNo === bedB.bedNo, `换床后 bedNo=${bedB.bedNo}`);

  cardio = await wardByCode(chen, 'WARD-CARDIO-1');
  const newBedA = cardio.beds.find((b) => b.id === bedAId);
  const newBedB = cardio.beds.find((b) => b.id === bedB.id);
  assert(newBedA?.status === 'available', `原床位 ${bedANo} 已释放为 available`);
  assert(newBedA?.occupant === null, `原床位 ${bedANo} 无占用者`);
  assert(newBedB?.status === 'occupied', `新床位 ${bedB.bedNo} 状态=occupied`);
  assert(newBedB?.occupant?.visitId === visitId, `新床位 ${bedB.bedNo} 占用者为本患者`);

  /* ---- 4) 转科（admin，心血管内科 → 呼吸内科一病区）---- */
  console.log('[4] 转科 → WARD-RESP-1（跨科室/病区，自动分配床位）');
  const respWard = await wardByCode(admin, 'WARD-RESP-1');
  const transfer = await api(
    'POST',
    `/api/v1/inpatient/patients/${visitId}/transfer`,
    admin,
    { targetWardId: respWard.id, reason: 'E2E 转呼吸内科' },
  );
  assert(transfer.status === 200, `转科 HTTP 200（实际 ${transfer.status} ${JSON.stringify(transfer.data).slice(0, 120)}）`);
  const bedCId: string = transfer.data.bedId;
  const bedCNo: string = transfer.data.bedNo;
  assert(transfer.data.department === '呼吸内科', `转科后科室=呼吸内科（实际 ${transfer.data.department}）`);
  assert(transfer.data.wardId === respWard.id, '转科后 wardId=呼吸病区');
  assert(!!bedCId, `在呼吸病区分配到床位 ${bedCNo}`);

  // 原心血管病区床位 B 已释放
  cardio = await wardByCode(admin, 'WARD-CARDIO-1');
  const releasedB = cardio.beds.find((b) => b.id === bedB.id);
  assert(releasedB?.status === 'available', `心血管原床位 ${bedB.bedNo} 转科后释放为 available`);
  // 呼吸病区床位 C 占用
  const respAfter = await wardByCode(admin, 'WARD-RESP-1');
  const bedC = respAfter.beds.find((b) => b.id === bedCId);
  assert(bedC?.status === 'occupied', `呼吸床位 ${bedCNo} 状态=occupied`);
  assert(bedC?.occupant?.visitId === visitId, `呼吸床位 ${bedCNo} 占用者为本患者`);

  /* ---- 5) 在院详情：ADT 移动史 [admit, bed_change, transfer] ---- */
  console.log('[5] 在院详情读取 ADT 移动史');
  const detail = await api('GET', `/api/v1/inpatient/patients/${visitId}`, admin);
  assert(detail.status === 200, `详情 HTTP 200（实际 ${detail.status}）`);
  const types: string[] = (detail.data.movements ?? []).map((m: any) => m.eventType);
  assert(types.length >= 3, `移动史 ≥3 条（实际 ${types.length}: ${types.join(',')}）`);
  assert(types[0] === 'admit', `第 1 条=admit`);
  assert(types.includes('bed_change'), `包含 bed_change`);
  assert(types.includes('transfer'), `包含 transfer`);
  const transferEvt = detail.data.movements.find((m: any) => m.eventType === 'transfer');
  assert(transferEvt?.fromDepartment === '心血管内科' && transferEvt?.toDepartment === '呼吸内科',
    `转科事件 科室移动 心血管内科→呼吸内科`);

  /* ---- 6) 出院（admin，释放呼吸床位）---- */
  console.log('[6] 出院 → 释放床位');
  const discharge = await api(
    'POST',
    `/api/v1/inpatient/patients/${visitId}/discharge`,
    admin,
    { reason: 'E2E 医嘱出院' },
  );
  assert(discharge.status === 200, `出院 HTTP 200（实际 ${discharge.status}）`);
  // ★ 关键修正：严格按真实返回 { visitId, dischargedAt, bedId } 取数，不读取 movements
  assert(discharge.data.visitId === visitId, `出院返回 visitId 匹配`);
  assert(typeof discharge.data.dischargedAt === 'string', `出院返回 dischargedAt（${discharge.data.dischargedAt}）`);
  assert(discharge.data.bedId === bedCId, `出院返回 bedId=被释放床 ${bedCNo}`);
  assert(discharge.data.movements === undefined, '出院返回体不含 movements 字段（与真实契约一致）');

  /* ---- 7) 出院后核验：床位 C 释放、在院列表无此患者、详情 404 ---- */
  console.log('[7] 出院后床位与列表核验');
  const respFinal = await wardByCode(admin, 'WARD-RESP-1');
  const bedCFinal = respFinal.beds.find((b) => b.id === bedCId);
  assert(bedCFinal?.status === 'available', `呼吸床位 ${bedCNo} 已释放为 available`);
  assert(bedCFinal?.occupant === null, `呼吸床位 ${bedCNo} 无占用者`);

  const list = await api('GET', '/api/v1/inpatient/patients', admin);
  assert(list.status === 200, '在院列表 HTTP 200');
  assert(!list.data.items.some((p: any) => p.visitId === visitId), '在院列表已无该患者');

  const detailAfter = await api('GET', `/api/v1/inpatient/patients/${visitId}`, admin);
  assert(detailAfter.status === 404, `出院后详情返回 404（实际 ${detailAfter.status}）`);

  /* ------------------------------ 汇总 -------------------------------- */
  console.log('\n================ E2E 汇总 ================');
  if (failures === 0) {
    console.log('全部断言通过：入院→分配→换床→转科→出院释放床位 全链路闭环成功。');
    console.log('================ E2E 结果: SUCCESS ================');
    process.exit(0);
  } else {
    console.error(`存在 ${failures} 个失败断言。`);
    console.log('================ E2E 结果: FAILED ================');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('E2E 执行异常:', e);
  process.exit(1);
});
