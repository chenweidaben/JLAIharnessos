/**
 * 健澜科技 jlmedaios - PostgreSQL 重启持久化取证脚本（M1-A）
 *
 * 两阶段（MODE 环境变量）：
 *  - prepare：经 BFF 入院 1 名标签 RESTART 的患者并做一次换床，
 *      记录其 visitId/床位与“在院数/占用数”基线到状态文件，患者保持在院。
 *  - verify ：PostgreSQL 重启后运行，核验该患者仍在院、仍占同一床位、
 *      在院/占用数与重启前一致，住院与 ADT 记录未丢失；随后出院清理恢复基线。
 *
 * 用法：
 *   bun run scripts/inpatient-restart.ts            # MODE=prepare
 *   # … pg_ctl stop / start …
 *   $env:MODE="verify"; bun run scripts/inpatient-restart.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

const BASE = process.env.BFF_BASE ?? 'http://127.0.0.1:8080';
const MODE = process.env.MODE ?? 'prepare';
const STATE = process.env.STATE_FILE ?? `${process.env.TEMP ?? '/tmp'}/jl_restart_state.json`;

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

async function wardByCode(token: string, wardCode: string): Promise<any> {
  const { data } = await api('GET', '/api/v1/inpatient/bed-map', token);
  return data.wards.find((w: any) => w.code === wardCode);
}

async function counts(token: string) {
  const list = await api('GET', '/api/v1/inpatient/patients', token);
  const map = await api('GET', '/api/v1/inpatient/bed-map', token);
  const occupied = map.data.wards.reduce(
    (s: number, w: any) => s + w.stats.occupied,
    0,
  );
  return { ongoing: list.data.total as number, occupied };
}

async function prepare(): Promise<void> {
  const login = await api('POST', '/api/v1/auth/login', undefined, {
    username: 'admin',
    password: 'trial-build',
  });
  const token = login.data.tokens.accessToken;
  const ward = await wardByCode(token, 'WARD-CARDIO-1');

  const before = await counts(token);
  console.log('[prepare] 重启前 在院数=', before.ongoing, ' 占用数=', before.occupied);

  // 入院（自动分配）
  const ts = Date.now().toString(36);
  const admit = await api('POST', '/api/v1/inpatient/admissions', token, {
    newPatient: { nameMasked: `重启*${ts.slice(-4)}`, gender: '女', birthDate: '1975-08-20', tags: ['RESTART'] },
    wardId: ward.id,
    diagnosis: '重启持久化取证（虚构）',
    condition: 'stable',
    admissionType: 'elective',
    source: 'other',
  });
  assert(admit.status === 200, `入院成功（${admit.status}）`);
  const visitId: string = admit.data.visitId;
  const firstBed = { id: admit.data.bedId, no: admit.data.bedNo };

  // 做一次换床，增加 ADT 记录
  const ward2 = await wardByCode(token, 'WARD-CARDIO-1');
  const target = ward2.beds.find((b: any) => b.status === 'available');
  const change = await api('POST', `/api/v1/inpatient/patients/${visitId}/bed-change`, token, {
    targetBedId: target.id,
    reason: '重启取证换床',
  });
  assert(change.status === 200, `换床成功（${change.status}）`);
  const finalBed = { id: change.data.bedId, no: change.data.bedNo };

  const after = await counts(token);
  const state = { visitId, firstBed, finalBed, before, after, preparedAt: new Date().toISOString() };
  await Bun.write(STATE, JSON.stringify(state, null, 2));
  console.log('[prepare] 已入院并换床：');
  console.log('    visitId =', visitId);
  console.log('    最终床位 =', finalBed.no, finalBed.id);
  console.log('    换床后 在院数=', after.ongoing, ' 占用数=', after.occupied);
  console.log('    状态文件 =', STATE);
  console.log('[prepare] 现在请停止并重启 PostgreSQL，然后以 MODE=verify 运行。');
}

async function verify(): Promise<void> {
  const state = JSON.parse(await Bun.file(STATE).text());
  const login = await api('POST', '/api/v1/auth/login', undefined, {
    username: 'admin',
    password: 'trial-build',
  });
  const token = login.data.tokens.accessToken;

  const now = await counts(token);
  console.log('[verify] 重启后 在院数=', now.ongoing, ' 占用数=', now.occupied);
  assert(now.ongoing === state.after.ongoing, `在院数与重启前一致（${state.after.ongoing}）`);
  assert(now.occupied === state.after.occupied, `占用数与重启前一致（${state.after.occupied}）`);

  // 患者仍在院且占同一床位
  const ward = await wardByCode(token, 'WARD-CARDIO-1');
  const bed = ward.beds.find((b: any) => b.id === state.finalBed.id);
  assert(!!bed, `重启后床位 ${state.finalBed.no} 仍存在`);
  assert(bed?.status === 'occupied', `床位 ${state.finalBed.no} 仍为 occupied`);
  assert(bed?.occupant?.visitId === state.visitId, `床位 ${state.finalBed.no} 仍由同一患者占用`);

  const detail = await api('GET', `/api/v1/inpatient/patients/${state.visitId}`, token);
  assert(detail.status === 200, `仍可读取在院详情（${detail.status}）`);
  const evTypes = (detail.data.movements ?? []).map((m: any) => m.eventType);
  assert(evTypes.includes('admit') && evTypes.includes('bed_change'),
    `ADT 记录未丢失（${evTypes.join(',')}）`);

  // 清理：出院恢复基线
  const dis = await api('POST', `/api/v1/inpatient/patients/${state.visitId}/discharge`, token, {
    reason: '重启取证清理',
  });
  assert(dis.status === 200, `出院清理成功（${dis.status}）`);
  const restored = await counts(token);
  assert(restored.ongoing === state.before.ongoing, `清理后在院数恢复基线 ${state.before.ongoing}`);
  assert(restored.occupied === state.before.occupied, `清理后占用数恢复基线 ${state.before.occupied}`);

  if (failures === 0) {
    console.log('\n[verify] 重启持久化结论：重启后在院状态/床位占用/住院与ADT记录均未丢失。SUCCESS');
    process.exit(0);
  } else {
    console.error(`\n[verify] ${failures} 个断言失败。FAILED`);
    process.exit(1);
  }
}

if (MODE === 'prepare') await prepare();
else if (MODE === 'verify') await verify();
else throw new Error(`未知 MODE=${MODE}`);
