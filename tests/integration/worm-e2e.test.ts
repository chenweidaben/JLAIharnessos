/**
 * 健澜AI原生医院操作系统OS - P5-2/P5-4 WORM E2E（国密硬化版，精简写调用）
 * 同进程连跑两轮不重启。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { beforeAll, describe, expect, it } from 'bun:test';
import * as crypto from 'node:crypto';

const BASE = process.env.BFF_BASE_URL ?? 'http://127.0.0.1:8080';
const JWT_SECRET = process.env.JWT_SECRET ?? 'local-dev-jwt-secret-jlmedaios-2026';

interface CallResult { httpStatus: number; code: number; data: any; raw?: string; }
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
async function call(method: string, path: string, opts: {token?: string; body?: unknown} = {}): Promise<CallResult> {
  const headers: Record<string,string> = {'Content-Type':'application/json'};
  if (opts.token) headers['Authorization'] = `Bearer ${opts.token}`;
  let last: CallResult = { httpStatus: 0, code: 0, data: null, raw: '' };
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetch(BASE+path,{method,headers,body:opts.body===undefined?undefined:JSON.stringify(opts.body)});
    const txt = await res.text();
    let raw:any=null; try{raw=JSON.parse(txt);}catch{raw=null;}
    last = { httpStatus: res.status, code:raw?.code, data:raw?.data??null, raw: txt };
    if (res.status !== 429) return last;
    // 429：读 Retry-After 头，否则退避 5s
    const ra = Number(res.headers.get('retry-after'));
    const waitMs = (Number.isFinite(ra) && ra > 0 ? ra : 5) * 1000;
    if (attempt < 7) await new Promise((r) => setTimeout(r, waitMs));
  }
  return last;
}

const SALT = Date.now().toString(36) + Math.floor(Math.random()*1000);
const admin = sign(['admin'], '管理员', `admin-${SALT}`);
const doctor = sign(['doctor'], '医生', `doc-${SALT}`);

beforeAll(async () => {
  const health = await fetch(BASE+'/health');
  if (health.status!==200) throw new Error('BFF 未就绪');
  // 每轮开始前清探针
  await call('POST','/api/v1/worm/_probes/reset',{token:admin,body:{}});
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
    expect(r.data.sm2Signature.length).toBeGreaterThan(0);
    (globalThis as any).__seg1 = r.data.segmentId;
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
    const seg1 = (globalThis as any).__seg1;
    const r = await call('GET',`/api/v1/worm/segments/${seg1}/content?format=json`,{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.data.events.length).toBeGreaterThan(0);
    expect(r.data.signatureValid).toBe(true);
  });
  it('GET content?format=csv → header', async () => {
    const seg1 = (globalThis as any).__seg1;
    const r = await call('GET',`/api/v1/worm/segments/${seg1}/content?format=csv`,{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.raw).toMatch(/^seq,/);
  });
});

describe('影子探针 digest', () => {
  let probeId = '';
  it('create probe + _tamper-digest → verify brokenScope=probe', async () => {
    const seg1 = (globalThis as any).__seg1;
    const t = await call('POST','/api/v1/worm/_tamper',{token:admin,body:{segmentId:seg1}});
    expect(t.httpStatus).toBe(200);
    probeId = t.data.probeId;
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
    const seg1 = (globalThis as any).__seg1;
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
    const seg1 = (globalThis as any).__seg1;
    const r = await call('GET',`/api/v1/worm/segments/${seg1}`,{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.data.digestAlg).toBe('SM3');
    expect(r.data.sm4Encrypted).toBe(true);
  });
  it('format 非法 → 400', async () => {
    const seg1 = (globalThis as any).__seg1;
    const r = await call('GET',`/api/v1/worm/segments/${seg1}/content?format=xml`,{token:admin});
    expect(r.httpStatus).toBe(400);
  });
});

describe('P5-5 store/info + seqContinuity + 路径穿越', () => {
  it('GET /store/info 返 kind=memory 与 segmentCount≥1', async () => {
    const r = await call('GET','/api/v1/worm/store/info',{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.data.kind).toBe('memory');
    expect(r.data.segmentCount).toBeGreaterThanOrEqual(1);
  });
  it('verify?scope=real 返 seqContinuity 对象', async () => {
    const r = await call('POST','/api/v1/worm/verify?scope=real',{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.data.seqContinuity).toBeDefined();
    expect(typeof r.data.seqContinuity.valid).toBe('boolean');
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
    // seal 可能因无新事件返 200 no-events（前序已封过），此时直接搜既有段即可
    const r = await call('GET','/api/v1/worm/search?limit=10',{token:admin});
    expect(r.httpStatus).toBe(200);
    expect(r.data.total).toBeGreaterThanOrEqual(1);
    expect(r.data.scannedSegments).toBeGreaterThanOrEqual(1);
    expect(Array.isArray(r.data.rows)).toBe(true);
    expect(r.data.rows[0]).toHaveProperty('seq');
    expect(r.data.rows[0]).toHaveProperty('occurredAt');
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
    expect(v.data.seqContinuity.gaps).toEqual([]);
    expect(v.data.seqContinuity.duplicateSeq).toEqual([]);
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
    const pr = await call('POST','/api/v1/worm/keys/purge',{token:admin,body:{keyId:kNew}});
    expect(pr.httpStatus).toBe(409);
    expect(pr.raw).toContain('key-in-use');
    const prBody = JSON.parse(pr.raw ?? '{}') as { refs?: number };
    expect(prBody.refs).toBe(2);
    // retire kNew：200
    const rt = await call('POST','/api/v1/worm/keys/retire',{token:admin,body:{keyId:kNew}});
    expect(rt.httpStatus).toBe(200);
    expect(rt.data.ok).toBe(true);
    // verify real
    const v = await call('POST','/api/v1/worm/verify?scope=real',{token:admin,body:{}});
    expect(v.httpStatus).toBe(200);
    expect(v.data.valid).toBe(true);
    expect(v.data.signatureValid).toBe(true);
  });
});
