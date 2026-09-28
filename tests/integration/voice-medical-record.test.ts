/**
 * 健澜科技 jlmedaios - 语音电子病历 集成测试（M2-C）
 *
 * 直接对真实 PostgreSQL 运行聚合器与 BFF 路由（无 mock），覆盖：
 *  - 口述转写 + 医疗后处理：去填充词、术语纠正、用药剂量/频次标记、低置信提示；
 *  - 复核转病历：用药未确认 409、空文本 400、本人确认后生成 signed 病历；
 *  - 临床写操作本人签名：非 owner 转病历 / 作废 403；重复转换 409；
 *  - 未知音频引用不臆造（空文本 + 明确提示）；会话列表范围；BFF 权限/信封。
 *
 * 转写在无 ASR_PROVIDER 时走明确标注的本地演示引擎（local-demo）。
 * 需要可用 PostgreSQL；无 DB 自动跳过。afterAll 删除全部测试夹具。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { afterAll, describe, expect, it } from 'bun:test';

import {
  closeDbForTest,
  getDb,
  verifyDbConnection,
} from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import {
  getUserByUsername,
  getUserRoleLinks,
} from '../../src/db/repositories/userRepo.js';
import { createPatient } from '../../src/db/repositories/patientRepo.js';
import { createVisit } from '../../src/db/repositories/visitRepo.js';
import { getMedicalRecordById } from '../../src/db/repositories/medicalRecordRepo.js';
import {
  convert,
  dictate,
  discard,
  getDictation,
  listMyDictations,
  VoiceMedicalError,
} from '../../src/bff/aggregators/voiceMedicalAggregator.js';
import { voiceMedicalRoutes } from '../../src/bff/routes/voiceMedical.js';
import type { Ctx } from '../../src/bff/types.js';

let dbAvailable = false;
let admin: AuthView;
let doctorChen: AuthView;
let doctorZhou: AuthView;
let pharmacist: AuthView;

const seq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

async function newVisit(department = '心血管内科') {
  const patient = await createPatient({
    mrn: `M2C${seq()}`,
    nameMasked: `语*${seq().slice(-4)}`,
    gender: '未知',
    birthDate: null,
    tags: ['M2C_TEST'],
  });
  const visit = await createVisit({
    patientId: patient.id,
    visitType: 'outpatient',
    department,
  });
  return { patient, visit };
}

/** 期望某个错误及其 HTTP 状态码。 */
async function expectError(p: Promise<unknown>, status: number) {
  try {
    await p;
    throw new Error('应当抛错但未抛错');
  } catch (e) {
    expect(e).toBeInstanceOf(VoiceMedicalError);
    expect((e as VoiceMedicalError).status).toBe(status);
  }
}

try {
  await verifyDbConnection(2, 1000);
  dbAvailable = true;
} catch {
  dbAvailable = false;
}
if (dbAvailable) {
  const load = async (username: string): Promise<AuthView> => {
    const user = await getUserByUsername(username);
    if (!user) throw new Error(`缺少测试账号 ${username}`);
    return buildAuthView(user, await getUserRoleLinks(user.id));
  };
  admin = await load('admin');
  doctorChen = await load('doctor_chen');
  doctorZhou = await load('doctor_zhou');
  pharmacist = await load('pharmacist_wang');
}

afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    // 语音转换产生的病历随患者级联清理；先删 voice_dictations（外键到 visit/record）
    await db`
      DELETE FROM clinical.voice_dictations vd
      USING clinical.visits v, clinical.patients p
      WHERE vd.visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M2C_TEST"]'::jsonb
    `;
    await db`
      DELETE FROM clinical.medical_records m
      USING clinical.visits v, clinical.patients p
      WHERE m.visit_id=v.id AND v.patient_id=p.id AND p.tags @> '["M2C_TEST"]'::jsonb
    `;
    await db`
      DELETE FROM clinical.visits v
      USING clinical.patients p
      WHERE v.patient_id=p.id AND p.tags @> '["M2C_TEST"]'::jsonb
    `;
    await db`DELETE FROM clinical.patients WHERE tags @> '["M2C_TEST"]'::jsonb`;
    await closeDbForTest();
  }
});

/* ------------------------------ 转写 + 后处理 ------------------------------ */

describe.skipIf(!dbAvailable)('M2-C 语音转写与医疗后处理', () => {
  it('心血管复诊：去填充词、术语纠正、剂量/频次标记、低置信提示', async () => {
    const { visit } = await newVisit();
    const { dictation: d } = await dictate(doctorChen, {
      visitId: visit.id,
      audioRef: 'demo:cardiology-followup',
      audioFormat: 'wav',
    });

    expect(d.status).toBe('draft');
    expect(d.asrProvider).toBe('local-demo');
    expect(d.rawTranscript).toContain('心梗');
    expect(d.rawTranscript).toContain('二甲双瓜');

    // 规范文本：填充词已去除、术语已纠正
    expect(d.normalizedText).not.toContain('嗯');
    expect(d.normalizedText).toContain('心肌梗死');
    expect(d.normalizedText).toContain('二甲双胍');
    expect(d.normalizedText).not.toContain('二甲双瓜');

    const froms = d.corrections.map((c) => c.from);
    expect(froms).toContain('心梗');
    expect(froms).toContain('二甲双瓜');

    // 剂量 / 频次标记（不臆改数值）
    const raws = d.medicationMentions.map((m) => m.raw);
    expect(raws.some((r) => r.includes('100毫克'))).toBe(true);
    expect(raws.some((r) => r.includes('每日一次'))).toBe(true);
    expect(raws.some((r) => r.includes('0.5克'))).toBe(true);
    expect(raws.some((r) => r.includes('每天两次'))).toBe(true);

    // 低置信片段 + 本地演示引擎标识
    expect(d.warnings.join('')).toContain('置信度偏低');
    expect(d.warnings.join('')).toContain('local-demo');
    expect(d.avgConfidence).not.toBeNull();
    expect(d.avgConfidence!).toBeLessThan(0.9);
  });

  it('未知音频引用：不臆造，返回空文本与明确提示', async () => {
    const { visit } = await newVisit();
    const { dictation: d } = await dictate(doctorChen, {
      visitId: visit.id,
      audioRef: 'does-not-exist-ref',
    });
    expect(d.normalizedText).toBe('');
    expect(d.warnings.length).toBeGreaterThan(0);
    expect(d.warnings.join('')).toContain('未预置');
  });
});

/* ------------------------------ 复核转病历 ------------------------------ */

describe.skipIf(!dbAvailable)('M2-C 复核转病历与本人签名', () => {
  it('用药未确认 409；确认并提交后生成 signed 病历', async () => {
    const { visit } = await newVisit();
    const { dictation: created } = await dictate(doctorChen, {
      visitId: visit.id,
      audioRef: 'demo:cardiology-followup',
    });

    // 存在用药提及但未确认 → 409
    await expectError(
      convert(doctorChen, created.id, {
        finalText: created.normalizedText,
        recordType: 'outpatient',
      }),
      409,
    );

    // 空文本 → 400
    await expectError(
      convert(doctorChen, created.id, {
        finalText: '   ',
        confirmMedications: true,
      }),
      400,
    );

    // 本人确认用药并提交 → 转病历
    const res = await convert(doctorChen, created.id, {
      finalText: created.normalizedText,
      recordType: 'outpatient',
      title: '心血管复诊病历',
      confirmMedications: true,
    });
    expect(res.recordId).toBeTruthy();
    expect(res.dictation.status).toBe('converted');
    expect(res.dictation.resultingRecordId).toBe(res.recordId);

    const record = await getMedicalRecordById(res.recordId);
    expect(record).not.toBeNull();
    expect(record!.status).toBe('signed');
    expect(record!.authorId).toBe(doctorChen.id);
    expect(record!.signedBy).toBe(doctorChen.id);
    expect(record!.signedAt).not.toBeNull();

    // 重复转换 → 409
    await expectError(
      convert(doctorChen, created.id, {
        finalText: created.normalizedText,
        confirmMedications: true,
      }),
      409,
    );
  });

  it('临床写操作本人签名：非 owner 转病历 403', async () => {
    const { visit } = await newVisit();
    const { dictation: created } = await dictate(doctorChen, {
      visitId: visit.id,
      audioRef: 'demo:cardiology-followup',
    });
    await expectError(
      convert(doctorZhou, created.id, {
        finalText: created.normalizedText,
        confirmMedications: true,
      }),
      403,
    );
  });

  it('作废：owner 可作废；非 owner 403；已转换不可作废 409', async () => {
    const { visit } = await newVisit();
    const { dictation: created } = await dictate(doctorChen, {
      visitId: visit.id,
      audioRef: 'demo:respiratory-consult',
    });

    await expectError(discard(doctorZhou, created.id), 403);

    const { dictation: dropped } = await discard(doctorChen, created.id);
    expect(dropped.status).toBe('discarded');

    await expectError(discard(doctorChen, created.id), 409);
  });

  it('会话详情与列表范围：医师见本人，全院范围可见', async () => {
    const { visit } = await newVisit();
    const { dictation: created } = await dictate(doctorChen, {
      visitId: visit.id,
      audioRef: 'demo:respiratory-consult',
    });

    const detail = await getDictation(doctorChen, created.id);
    expect(detail.dictation.id).toBe(created.id);

    const mine = await listMyDictations(doctorChen, { visitId: visit.id });
    expect(mine.items.every((d) => d.doctorId === doctorChen.id)).toBe(true);
    expect(mine.items.some((d) => d.id === created.id)).toBe(true);

    const all = await listMyDictations(admin, { visitId: visit.id });
    expect(all.items.some((d) => d.id === created.id)).toBe(true);
  });
});

/* ------------------------------ BFF 路由 ------------------------------ */

function makeCtx(
  view: AuthView | null,
  opts: { params?: Record<string, string>; query?: Record<string, string>; body?: unknown } = {},
): Ctx {
  const user = view
    ? {
        id: view.id, name: view.realName, roles: view.rawRoles, permissions: view.permissions,
      }
    : null;
  return {
    params: opts.params ?? {},
    query: new URLSearchParams(opts.query ?? {}),
    body: async () => opts.body ?? {},
    user,
    traceId: 'test',
  } as unknown as Ctx;
}
const findRoute = (method: string, path: string) =>
  voiceMedicalRoutes.find((r) => r.method === method && r.path === path)!;

describe.skipIf(!dbAvailable)('M2-C BFF 路由：权限与信封', () => {
  it('药师无 medical_record:write 发起口述 → 403', async () => {
    const { visit } = await newVisit();
    const res = await findRoute('POST', '/api/v1/voice-medical/dictations').handle(
      makeCtx(pharmacist, { body: { visitId: visit.id, audioRef: 'demo:cardiology-followup' } }),
    );
    expect(res.status).toBe(403);
    expect((await res.json()).code).not.toBe(0);
  });

  it('未登录访问列表 → 401', async () => {
    const res = await findRoute('GET', '/api/v1/voice-medical/dictations').handle(makeCtx(null));
    expect(res.status).toBe(401);
  });

  it('医师发起口述成功：统一信封 code=0', async () => {
    const { visit } = await newVisit();
    const res = await findRoute('POST', '/api/v1/voice-medical/dictations').handle(
      makeCtx(doctorChen, {
        body: { visitId: visit.id, audioRef: 'demo:cardiology-followup', audioFormat: 'wav' },
      }),
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(0);
    expect(body.data.dictation.asrProvider).toBe('local-demo');
  });
});
