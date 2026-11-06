/**
 * 健澜AI原生医院操作系统OS - P5-2/P5-4 WORM E2E（国密硬化版，精简写调用）
 *
 * 运行前提（P5-17 加）：
 * - 本测试要求 BFF 进程是【新启动】的。同一 BFF 进程重复跑会出现 purge 后的验签失败假红
 * - beforeAll 会校验 verify?scope=all 通过；afterAll 快照 keyring，变了就 warn
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import * as crypto from 'node:crypto';
import { setupSchema, teardownSchema, startBff, stopBff, type BffHandle } from './worm-e2e-setup';

// P5-20: BASE 由 beforeAll spawn 的 BFF 动态决定（8081）
let BASE = process.env.BFF_BASE_URL ?? 'http://127.0.0.1:8080';
let bffHandle: BffHandle | null = null;
const JWT_SECRET = process.env.JWT_SECRET ?? 'local-dev-jwt-secret-jlmedaios-2026';

// E2E 响应 shape：聚合所有端点可能用到的字段（可选），避免 any。
// 单测层应精确类型；E2E 跨 20+ 端点，用一个宽接口收敛。
interface ApiData {
  keySource?: string;
  signerKeyId?: string;
  publicKeyHex?: string;
  valid?: boolean;
  signatureValid?: boolean;
  digestValid?: boolean;
  realChainValid?: boolean;
  brokenScope?: string;
  errors?: { code?: string; segmentId?: string; message?: string }[];
  seqContinuity?: { valid?: boolean; gaps?: unknown[]; duplicateSeq?: unknown[] };
  digestAlg?: string;
  digestSm3?: string;
  sm4Encrypted?: boolean;
  sm2Signature?: string;
  segmentId?: string;
  events?: unknown[];
  total?: number;
  scannedSegments?: number;
  rows?: Record<string, unknown>[];
  kind?: string;
  segmentCount?: number;
  enabled?: boolean;
  intervalMs?: number;
  threshold?: number;
  sealed?: boolean;
  reason?: string;
  fromKeyId?: string;
  toKeyId?: string;
  privateKeyHex?: string;
  probeId?: string;
  ok?: boolean;
  refs?: number;
}
interface CallResult<T = ApiData> { httpStatus: number; code: number; data: T; raw?: string; }
function b64url(o: unknown): string {
  return Buffer.from(JSON.stringify(o)).toString('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
}
function sign(roles: string[], name: string, sub: string): string {
  const now = Math.floor(Date.now()/1000);
  const h = b64url({alg:'HS256',typ:'JWT'});
  const p = b64url({sub,name,roles,iss:'jianlan-bff',nbf:now,exp:now+3600});
  const data = `${h}.${p}`;
  const sig = crypto.createHmac('sha256',JWT_SECRET).update(data).digest('base64').replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
  return `${data}.${sig}`;
}
async function call<T = ApiData>(method: string, path: string, opts: {token?: string; body?: unknown} = {}): Promise<CallResult<T>> {
  const headers: Record<string,string> = {'Content-Type':'application/json'};
  if (opts.token) headers.Authorization = `Bearer ${opts.token}`;
  let last: CallResult<ApiData> = { httpStatus: 0, code: 0, data: {}, raw: '' };
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(BASE+path,{method,headers,body:opts.body===undefined?undefined:JSON.stringify(opts.body)});
    const txt = await res.text();
    let raw: { code?: number; data?: ApiData } | null = null;
    try { raw = JSON.parse(txt) as { code?: number; data?: ApiData }; } catch { raw = null; }
    last = { httpStatus: res.status, code: raw?.code ?? 0, data: raw?.data ?? {}, raw: txt };
    if (res.status !== 429) return last as CallResult<T>;
    const ra = Number(res.headers.get('retry-after'));
    const waitMs = (Number.isFinite(ra) && ra > 0 ? ra : 5) * 1000;
    if (attempt < 7) await new Promise((r) => setTimeout(r, waitMs));
  }
  return last as CallResult<T>;
}

const SALT = Date.now().toString(36) + Math.floor(Math.random()*1000);
const admin = sign(['admin'], '管理员', `admin-${SALT}`);
const doctor = sign(['doctor'], '医生', `doc-${SALT}`);

let keyringBefore: string[] = [];
// 跨用例共享的段 ID（不用 globalThis 是为了避免 any）
let seg1: string | null = null;

interface KeysResponse { keySource?: string; signerKeyId?: string }
interface VerifyResponse { valid?: boolean; errors?: { code?: string; segmentId?: string; message?: string }[] }

beforeAll(async () => {
  // P5-20: E2E 自管 BFF 生命周期 + audit_e2e schema 隔离
  await setupSchema();
  bffHandle = await startBff();
  BASE = bffHandle.baseUrl;
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
  // P5-14 前置条件：KeyProvider 必须是可轮换的（file / demo-ephemeral），不能是 env。
  const ks = await call('GET','/api/v1/worm/keys',{token:admin});
  const ksData = ks.data as KeysResponse | null;
  if (ksData?.keySource === 'env') {
    throw new Error(
      'E2E 前置条件不满足：BFF 以 WORM_SM2_PRIVATE_KEY/PUBLIC_KEY 启动（EnvKeyProvider），'
      + '该模式按设计不支持 rotate（worm-env-rotate-not-supported），purge 会因此走 cannot-purge-active。'
      + '请用未设置 WORM_SM2_* 的 BFF 环境运行本 E2E。'
    );
  }
  if (!ksData?.signerKeyId) {
    throw new Error(
      'E2E 前置条件不满足：当前 BFF 的 keyring 不含 active signer key（可能已跑过多轮 purge）。'
      + '请重启 BFF 后重跑。'
    );
  }
  keyringBefore = [ksData.signerKeyId];

  // P5-17 关键前置：跑 /verify?scope=all，要求 valid=true。
  // 真正的假红机制不是 active key 缺失，而是历史段用的旧 key 被 purge 出环 → verify 报
  // unknown-key-id / signerKeyId-not-in-ring → valid=false。直接把这个状态收敛成 1 条前置失败，
  // 而不是让 seal/rotate/verify 用例散成 6 条红。
  const v = await call('GET','/api/v1/worm/verify?scope=all',{token:admin});
  const vData = v.data as VerifyResponse | null;
  if (vData?.valid === false) {
    const firstErr = vData.errors?.[0];
    throw new Error(
      `E2E 前置条件不满足：当前 BFF 的 WORM 链 verify=${vData.valid}`
      + (firstErr ? `（首个错误: code=${firstErr.code ?? '?'} seg=${firstErr.segmentId ?? '?'} msg=${firstErr.message ?? '?'}）` : '')
      + '。同进程已跑过多轮 purge/rotate，历史段的签名 key 已不在 keyring 环内。请重启 BFF 后重跑。'
    );
  }

  // 每轮开始前清探针
  await call('POST','/api/v1/worm/_probes/reset',{token:admin,body:{}});
});

afterAll(async () => {
  // P5-17：跑完后快照 keyring，若本次跑改变了 active key，warn 提示下次同进程会假红
  try {
    const ks = await call('GET','/api/v1/worm/keys',{token:admin});
    const after = (ks.data as KeysResponse | null)?.signerKeyId;
    if (after && keyringBefore[0] && after !== keyringBefore[0]) {
      console.warn(
        `[worm-e2e] 本次跑已改变 keyring active key: ${keyringBefore[0]} → ${after}。`
        + '下次在同一 BFF 进程上跑会因 purge 后的验签失败出现假红，请重启 BFF。'
      );
    }
  } catch { /* afterAll 失败不影响主结果 */ }
  // P5-20: kill BFF + DROP schema
  try { if (bffHandle) await stopBff(bffHandle); } catch {}
  try { await teardownSchema(); } catch {}
});

describe('P5-4 keys 不泄露私钥', () => {
  it('GET /keys 仅返 hex 公钥，无 PRIVATE KEY', async () => {
    const r = await call('GET','/api/v1/worm/keys',{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.data.publicKeyHex).toMatch(/^04[0-9a-f]{128}$/);
    expect(JSON.stringify(r.data)).not.toContain('PRIVATE KEY');
    expect(JSON.stringify(r.data)).not.toContain('privateKey');
  });
});

describe('seal + 国密字段', () => {
  it('generate 1 event + seal → 段含 SM3/SM4/SM2 字段', async () => {
    await call('POST','/api/v1/engagement/reports',{token:admin,body:{
      patientId:`P-${SALT}`, visitId:'V1', type:'lab', title:'血常规', result:'WBC 6.5', isAbnormal:false,
    }});
    const r = await call('POST','/api/v1/worm/segments/seal',{token:admin,body:{}});
    expect(r.httpStatus).toBe(201);
    expect(r.data.digestAlg).toBe('SM3');
    expect(r.data.digestSm3).toMatch(/^[0-9a-f]{64}$/);
    expect(r.data.sm4Encrypted).toBe(true);
    expect(r.data.sm2Signature?.length).toBeGreaterThan(0);
    seg1 = r.data.segmentId ?? null;
  });
});

describe('verify 国密字段', () => {
  it('verify?scope=real → digestValid+signatureValid=true', async () => {
    const r = await call('POST','/api/v1/worm/verify?scope=real',{token:admin,body:{}});
    expect(r.httpStatus).toBe(200);
    expect(r.data.digestValid).toBe(true);
    expect(r.data.signatureValid).toBe(true);
  });
});

describe('content 解密', () => {
  it('GET content?format=json → events + digestValid/signatureValid', async () => {
    if (!seg1) throw new Error('seg1 not seeded');
    const r = await call('GET',`/api/v1/worm/segments/${seg1}/content?format=json`,{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.data.events?.length).toBeGreaterThan(0);
    expect(r.data.signatureValid).toBe(true);
  });
  it('GET content?format=csv → header', async () => {
    if (!seg1) throw new Error('seg1 not seeded');
    const r = await call('GET',`/api/v1/worm/segments/${seg1}/content?format=csv`,{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.raw).toMatch(/^seq,/);
  });
});

describe('影子探针 digest', () => {
  let probeId = '';
  it('create probe + _tamper-digest → verify brokenScope=probe', async () => {
    if (!seg1) throw new Error('seg1 not seeded');
    const t = await call('POST','/api/v1/worm/_tamper',{token:admin,body:{segmentId:seg1}});
    expect(t.httpStatus).toBe(200);
    probeId = t.data.probeId ?? '';
    const td = await call('POST','/api/v1/worm/_tamper-digest',{token:admin,body:{probeId}});
    expect(td.httpStatus).toBe(200);
    const v = await call('POST','/api/v1/worm/verify',{token:admin,body:{}});
    expect(v.data.valid).toBe(false);
    expect(v.data.brokenScope).toBe('probe');
  });
  it('真实段 verify?scope=real 仍 valid', async () => {
    const r = await call('POST','/api/v1/worm/verify?scope=real',{token:admin,body:{}});
    expect(r.data.realChainValid).toBe(true);
    expect(r.data.digestValid).toBe(true);
  });
  it('_probes/reset 后 verify 恢复 valid', async () => {
    await call('POST','/api/v1/worm/_probes/reset',{token:admin,body:{}});
    const r = await call('POST','/api/v1/worm/verify',{token:admin,body:{}});
    expect(r.data.valid).toBe(true);
  });
});

describe('影子探针 signature', () => {
  it('create probe + _tamper-signature → verify brokenScope=probe', async () => {
    if (!seg1) throw new Error('seg1 not seeded');
    const t = await call('POST','/api/v1/worm/_tamper',{token:admin,body:{segmentId:seg1}});
    expect(t.httpStatus).toBe(200);
    const ts = await call('POST','/api/v1/worm/_tamper-signature',{token:admin,body:{probeId:t.data.probeId}});
    expect(ts.httpStatus).toBe(200);
    const v = await call('POST','/api/v1/worm/verify',{token:admin,body:{}});
    expect(v.data.valid).toBe(false);
    expect(v.data.brokenScope).toBe('probe');
    await call('POST','/api/v1/worm/_probes/reset',{token:admin,body:{}});
  });
});

describe('doctor 越权 + 404', () => {
  it('doctor GET /segments → 403（read 计数但不写）', async () => {
    const r = await call('GET','/api/v1/worm/segments',{token:doctor});
    expect(r.httpStatus).toBe(403);
  });
  it('segmentId 不存在 → 404（合法格式但无此段）', async () => {
    const r = await call('GET','/api/v1/worm/segments/WORM-9999-nonexist',{token:admin});
    expect(r.httpStatus).toBe(404);
  });
  it('GET /segments 列表非空', async () => {
    const r = await call('GET','/api/v1/worm/segments',{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.data.total).toBeGreaterThanOrEqual(1);
  });
  it('GET /segments/:id 元信息含国密字段', async () => {
    if (!seg1) throw new Error('seg1 not seeded');
    const r = await call('GET',`/api/v1/worm/segments/${seg1}`,{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.data.digestAlg).toBe('SM3');
    expect(r.data.sm4Encrypted).toBe(true);
  });
  it('format 非法 → 400', async () => {
    if (!seg1) throw new Error('seg1 not seeded');
    const r = await call('GET',`/api/v1/worm/segments/${seg1}/content?format=xml`,{token:admin});
    expect(r.httpStatus).toBe(400);
  });
});

describe('P5-5 store/info + seqContinuity + 路径穿越', () => {
  it('GET /store/info 返 kind 非空与 segmentCount≥1', async () => {
    const r = await call('GET','/api/v1/worm/store/info',{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(['memory','fs','s3']).toContain(r.data.kind);
    expect(r.data.segmentCount).toBeGreaterThanOrEqual(1);
  });
  it('verify?scope=real 返 seqContinuity 对象', async () => {
    const r = await call('POST','/api/v1/worm/verify?scope=real',{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.data.seqContinuity).toBeDefined();
    expect(typeof r.data.seqContinuity?.valid).toBe('boolean');
  });
  it('非法 segmentId（路径穿越串）→ 400', async () => {
    const r = await call('GET','/api/v1/worm/segments/..%2F..%2Fetc%2Fpasswd',{token:admin});
    expect(r.httpStatus).toBe(400);
  });
});

describe('P5-6 自动调度 + 跨段检索', () => {
  it('GET /auto/config 返完整配置字段', async () => {
    const r = await call('GET','/api/v1/worm/auto/config',{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(typeof r.data.enabled).toBe('boolean');
    expect(r.data.intervalMs).toBeGreaterThan(0);
    expect(r.data.threshold).toBeGreaterThan(0);
  });
  it('POST /auto/config 写不触发 seal 的值', async () => {
    const r = await call('POST','/api/v1/worm/auto/config',{token:admin, body:{enabled:false, intervalMs:999999, threshold:999999}});
    expect(r.httpStatus).toBe(200);
    expect(r.data.enabled).toBe(false);
    expect(r.data.intervalMs).toBe(999999);
    expect(r.data.threshold).toBe(999999);
  });
  it('POST /auto/tick 返 sealed 布尔 + reason 字符串', async () => {
    const r = await call('POST','/api/v1/worm/auto/tick',{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(typeof r.data.sealed).toBe('boolean');
    // enabled=false 时 reason='disabled'
    expect(typeof r.data.reason).toBe('string');
  });
  it('GET /worm/search 跨段检索有结果（自造段不依赖冷启动）', async () => {
    // 先自造一个段，不依赖前序测试状态
    const rep = await call('POST','/api/v1/engagement/reports',{token:admin,body:{
      patientId:`P-search-${SALT}`, visitId:'V1', type:'lab', title:'search', result:'ok', isAbnormal:false,
    }});
    expect([200, 201]).toContain(rep.httpStatus);
    const sealRes = await call('POST','/api/v1/worm/segments/seal',{token:admin,body:{}});
    // P5-19: 显式断言 seal 结果，避免"no-events"被静默放过
    expect([200, 201]).toContain(sealRes.httpStatus);
    if (sealRes.httpStatus === 200 && sealRes.data.ok !== true) {
      // 审计 hook 异步落 pending 池的窗口：seal 200 no-events，等段出现
      console.log(`[P5-6] seal 未产段 (ok=${sealRes.data.ok} error=${(sealRes.data as any).error})，轮询 store/info`);
    }
    // P5-19: 有界等待 segmentCount>=1，记录每次轮询值，超时主动 seal 再等
    const trace: number[] = [];
    const pollUntilSegment = async (maxMs: number): Promise<number> => {
      const deadline = Date.now() + maxMs;
      let backoff = 200;
      while (Date.now() < deadline) {
        const info = await call('GET','/api/v1/worm/store/info',{token:admin});
        const n = info.data.segmentCount ?? 0;
        trace.push(n);
        if (n >= 1) return n;
        await new Promise((r) => setTimeout(r, backoff));
        backoff = Math.min(backoff + 150, 500);
      }
      return -1;
    };
    let segN = await pollUntilSegment(5000);
    if (segN < 1) {
      console.log(`[P5-6] 轮询 5s 仍 segmentCount=0，主动 seal 一次再等。trace=${JSON.stringify(trace)}`);
      await call('POST','/api/v1/worm/segments/seal',{token:admin,body:{}});
      segN = await pollUntilSegment(5000);
      if (segN < 1) {
        throw new Error(`[P5-6] segmentCount 始终为 0，trace=${JSON.stringify(trace)}`);
      }
    }
    // P5-20 debug: dump store/info + search
    const info = await call('GET','/api/v1/worm/store/info',{token:admin});
    console.log('[P5-6-dump] store/info:', JSON.stringify({segmentCount: info.data.segmentCount, oldestSeq: info.data.oldestSeq, newestSeq: info.data.newestSeq}));
    const r = await call('GET','/api/v1/worm/search?limit=10',{token:admin});
    console.log('[P5-6-dump] search:', JSON.stringify({total: r.data.total, scanned: r.data.scannedSegments, rowsLen: r.data.rows?.length}));
    // P5-20 debug: dump first segment details
    const segs = await call('GET','/api/v1/worm/segments',{token:admin});
    const firstSeg = (segs.data as any).rows?.[0] ?? (segs.data as any).segments?.[0];
    if (firstSeg) {
      console.log('[P5-6-dump] seg[0]:', JSON.stringify({
        segmentId: firstSeg.segmentId,
        eventCount: firstSeg.eventCount,
        fromSeq: firstSeg.fromSeq,
        toSeq: firstSeg.toSeq,
        cipherBytesLen: firstSeg.cipherBytes?.length ?? 'MISSING',
        ivLen: firstSeg.iv?.length ?? 0,
      }));
    }
    expect(r.httpStatus).toBe(200);
    expect(r.data.total).toBeGreaterThanOrEqual(1);
    expect(r.data.scannedSegments).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(r.data.rows)).toBe(true);
    expect(r.data.rows?.[0]).toHaveProperty('seq');
    expect(r.data.rows?.[0]).toHaveProperty('occurredAt');
  });
});

describe('P5-8 密钥轮换 HTTP 层', () => {
  it('rotate 后旧段 k1 与新段 k2 都验签通过', async () => {
    // seal 1 段（用当前 active key）
    await call('POST','/api/v1/worm/segments/seal',{token:admin,body:{}});
    const k1 = await call('GET','/api/v1/worm/keys',{token:admin});
    expect(k1.data.signerKeyId).toBeTruthy();
    // rotate
    const rot = await call('POST','/api/v1/worm/keys/rotate',{token:admin,body:{}});
    expect(rot.httpStatus).toBe(200);
    expect(rot.data.fromKeyId).toBe(k1.data.signerKeyId);
    expect(rot.data.toKeyId).toBeTruthy();
    expect(rot.data.toKeyId).not.toBe(rot.data.fromKeyId);
    // 确认返回不含私钥字段
    expect(rot.data.privateKeyHex).toBeUndefined();
    // 再 seal 1 段（用新 key）
    await call('POST','/api/v1/worm/segments/seal',{token:admin,body:{}});
    const k2 = await call('GET','/api/v1/worm/keys',{token:admin});
    expect(k2.data.signerKeyId).toBe(rot.data.toKeyId);
    // verify real 必须 valid
    const v = await call('POST','/api/v1/worm/verify?scope=real',{token:admin,body:{}});
    expect(v.httpStatus).toBe(200);
    expect(v.data.valid).toBe(true);
    expect(v.data.signatureValid).toBe(true);
    expect(v.data.seqContinuity?.gaps).toEqual([]);
    expect(v.data.seqContinuity?.duplicateSeq).toEqual([]);
  });
});

describe('P5-10 retire/purge HTTP 闭环', () => {
  it('seal 2 段(k1) → rotate → purge(k1) 409 key-in-use refs===2 → retire(k1) 200 → verify valid', async () => {
    // rotate 两次拿到一个全新 keyId kNew，再 seal 2 段用它，再 rotate 让 kNew 非 active
    await call('POST','/api/v1/worm/keys/rotate',{token:admin,body:{}});
    const afterRot = await call('GET','/api/v1/worm/keys',{token:admin});
    const kNew = afterRot.data.signerKeyId;
    // seed + seal 第一段
    await call('POST','/api/v1/audit/events/_seed',{token:admin,body:{items:[{actorId:'D1',actorRole:'doctor',action:'create',module:'emr',resourceType:'note',resourceId:'n1',result:'success',ip:'1.1.1.1',userAgent:'ua'}]}});
    await call('POST','/api/v1/worm/segments/seal',{token:admin,body:{}});
    // seed + seal 第二段
    await call('POST','/api/v1/audit/events/_seed',{token:admin,body:{items:[{actorId:'D2',actorRole:'doctor',action:'create',module:'emr',resourceType:'note',resourceId:'n2',result:'success',ip:'1.1.1.1',userAgent:'ua'}]}});
    await call('POST','/api/v1/worm/segments/seal',{token:admin,body:{}});
    // rotate 让 kNew 不再 active
    await call('POST','/api/v1/worm/keys/rotate',{token:admin,body:{}});
    // purge kNew：恰好 2 段引用
    const pr = await call('POST','/api/v1/worm/keys/purge',{token:admin,body:{keyId:kNew,confirm:'PURGE'}});
    expect(pr.httpStatus).toBe(409);
    expect(pr.raw).toContain('key-in-use');
    const prBody = JSON.parse(pr.raw ?? '{}') as { refs?: number };
    expect(prBody.refs).toBe(2);
    // retire kNew：200
    const rt = await call<{ ok?: boolean }>('POST','/api/v1/worm/keys/retire',{token:admin,body:{keyId:kNew}});
    expect(rt.httpStatus).toBe(200);
    expect(rt.data.ok).toBe(true);
    // verify real
    const v = await call<{ valid?: boolean; signatureValid?: boolean }>('POST','/api/v1/worm/verify?scope=real',{token:admin,body:{}});
    expect(v.httpStatus).toBe(200);
    expect(v.data.valid).toBe(true);
    expect(v.data.signatureValid).toBe(true);
  });
});




