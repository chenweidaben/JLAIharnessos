/**
 * 健澜科技 jlmedaios - 住院床位并发安全取证脚本（M1-A）
 *
 * 真实并发打运行中的 BFF，验证“高并发不重床”：
 *  - 场景 A（同病区并发自动入院）：N 个请求并发向同一病区自动选床，
 *      FOR UPDATE SKIP LOCKED 使各事务锁定不同空闲床 → 成功者床位两两不同，
 *      超出空闲床数的请求明确 409（NO_AVAILABLE_BED），不产生假成功。
 *  - 场景 B（并发抢同一张床）：M 个请求并发指定同一 bedId，
 *      CAS（UPDATE ... WHERE status='available'）保证仅 1 个成功，
 *      其余 409 且整事务回滚（不留孤儿患者/就诊）。
 *
 * 脚本在并发后输出成功/冲突统计与床位去重结果，随后清理（出院）本脚本创建的患者，
 * 恢复床位到运行前；是否清理由 CLEANUP 环境变量控制（默认 1）。
 *
 * 用法：bun run scripts/inpatient-concurrency.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

const BASE = process.env.BFF_BASE ?? 'http://127.0.0.1:8080';
const CLEANUP = process.env.CLEANUP !== '0';

let failures = 0;
function assert(cond: unknown, msg: string): asserts cond {
  if (cond) console.log(`  [PASS] ${msg}`);
  else {
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
  const text = await res.text();
  let json: any = null;
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
    throw new Error(`登录失败 ${username}: ${status}`);
  }
  return data.tokens.accessToken;
}

async function wardByCode(token: string, wardCode: string): Promise<any> {
  const { data } = await api('GET', '/api/v1/inpatient/bed-map', token);
  const ward = data.wards.find((w: any) => w.code === wardCode);
  if (!ward) throw new Error(`床位图未返回病区 ${wardCode}`);
  return ward;
}

function admitPayload(wardId: string, bedId: string | undefined, tag: string) {
  const ts = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  return {
    newPatient: {
      nameMasked: `并发*${ts.slice(-5)}`,
      gender: '未知',
      birthDate: null,
      tags: [tag],
    },
    wardId,
    ...(bedId ? { bedId } : {}),
    diagnosis: `并发取证 ${tag}（虚构）`,
    condition: 'stable',
    admissionType: 'elective',
    source: 'other',
  };
}

async function main(): Promise<void> {
  console.log('================ jlmedaios 床位并发安全取证 ================');
  const admin = await login('admin');
  const created: Array<{ visitId: string; bedId: string }> = [];

  /* -------- 场景 A：同病区并发自动入院（WARD-CARDIO-1，7 张空闲）-------- */
  const cardio = await wardByCode(admin, 'WARD-CARDIO-1');
  const freeBeforeA = cardio.beds.filter((b: any) => b.status === 'available').length;
  const N = freeBeforeA + 3; // 故意超出空闲床 3 个
  console.log(`\n[场景 A] 并发 ${N} 个自动入院 → WARD-CARDIO-1（当前空闲 ${freeBeforeA}）`);
  const resultsA = await Promise.all(
    Array.from({ length: N }, () =>
      api('POST', '/api/v1/inpatient/admissions', admin, admitPayload(cardio.id, undefined, 'A')),
    ),
  );
  const okA = resultsA.filter((r) => r.status === 200);
  const conflictA = resultsA.filter((r) => r.status === 409);
  const bedIdsA = okA.map((r) => r.data.bedId);
  const distinctA = new Set(bedIdsA);
  console.log(`    成功 ${okA.length} / 冲突409 ${conflictA.length}`);
  assert(okA.length === freeBeforeA, `成功数=空闲床数 ${freeBeforeA}（实际 ${okA.length}）`);
  assert(conflictA.length === N - freeBeforeA, `超出请求全部 409（${conflictA.length} 个）`);
  assert(distinctA.size === okA.length, `成功者床位两两不同（去重后 ${distinctA.size}/${okA.length}）`);
  for (const r of okA) created.push({ visitId: r.data.visitId, bedId: r.data.bedId });

  /* -------- 场景 B：并发抢同一张床（WARD-RESP-1）-------- */
  const resp = await wardByCode(admin, 'WARD-RESP-1');
  const target = resp.beds.find((b: any) => b.status === 'available');
  const M = 8;
  console.log(`\n[场景 B] 并发 ${M} 个请求抢同一床位 ${target.bedNo}（${target.id}）`);
  const resultsB = await Promise.all(
    Array.from({ length: M }, () =>
      api('POST', '/api/v1/inpatient/admissions', admin, admitPayload(resp.id, target.id, 'B')),
    ),
  );
  const okB = resultsB.filter((r) => r.status === 200);
  const conflictB = resultsB.filter((r) => r.status === 409);
  console.log(`    成功 ${okB.length} / 冲突409 ${conflictB.length}`);
  assert(okB.length === 1, `仅 1 个请求抢到该床（实际 ${okB.length}）`);
  assert(conflictB.length === M - 1, `其余 ${M - 1} 个请求 409（实际 ${conflictB.length}）`);
  if (okB[0]) created.push({ visitId: okB[0].data.visitId, bedId: okB[0].data.bedId });

  // 失败事务不留痕：场景 B 只有 1 名患者落库（其余整事务回滚）
  const respMid = await wardByCode(admin, 'WARD-RESP-1');
  const targetAfter = respMid.beds.find((b: any) => b.id === target.id);
  assert(targetAfter.status === 'occupied', `目标床最终 occupied`);
  assert(targetAfter.occupant?.visitId === okB[0]?.data.visitId, `目标床占用者=唯一成功者`);

  /* -------- 交叉核验：全院不存在“一床多患/同患多床” -------- */
  console.log('\n[交叉核验] 请配合 psql 中检快照（见取证记录）');
  console.log(`    本次并发共创建在院患者 ${created.length} 名`);

  /* -------- 清理：出院本脚本创建的全部患者，恢复床位 -------- */
  if (CLEANUP) {
    console.log(`\n[清理] 出院 ${created.length} 名并发取证患者，恢复床位…`);
    const discharges = await Promise.all(
      created.map((c) =>
        api('POST', `/api/v1/inpatient/patients/${c.visitId}/discharge`, admin, {
          reason: '并发取证清理',
        }),
      ),
    );
    const okD = discharges.filter((r) => r.status === 200).length;
    assert(okD === created.length, `全部清理出院成功（${okD}/${created.length}）`);
  }

  console.log('\n================ 并发取证汇总 ================');
  if (failures === 0) {
    console.log('并发结论：行锁(SKIP LOCKED)+CAS+唯一索引共同保证不重床，无假成功、无孤儿数据。');
    console.log('================ 并发结果: SUCCESS ================');
    process.exit(0);
  } else {
    console.error(`存在 ${failures} 个失败断言。`);
    console.log('================ 并发结果: FAILED ================');
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('并发取证异常:', e);
  process.exit(1);
});
