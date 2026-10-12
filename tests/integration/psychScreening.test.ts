/**
 * 健澜科技 jlmedaios - M44-A 心理筛查集成测试
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { afterAll, describe, expect, it } from 'bun:test';
import { closeDbForTest, getDb, verifyDbConnection } from '../../src/db/pool.js';
import { buildAuthView, type AuthView } from '../../src/bff/view/userView.js';
import { getUserByUsername, getUserRoleLinks } from '../../src/db/repositories/userRepo.js';
import { phq9Level, gad7Level, needsReferral } from '../../src/medical-tools/nursing/psychScreening.js';
import { createScreeningView, PsychError } from '../../src/bff/aggregators/psychScreeningAggregator.js';

describe('纯函数', () => {
  it('PHQ9 五档', () => {
    expect(phq9Level(2)).toBe('none');
    expect(phq9Level(7)).toBe('mild');
    expect(phq9Level(12)).toBe('moderate');
    expect(phq9Level(17)).toBe('moderately_severe');
    expect(phq9Level(22)).toBe('severe');
  });
  it('GAD7 四档', () => {
    expect(gad7Level(2)).toBe('none');
    expect(gad7Level(7)).toBe('mild');
    expect(gad7Level(12)).toBe('moderate');
    expect(gad7Level(18)).toBe('severe');
  });
  it('转诊判定', () => {
    expect(needsReferral(16, 5)).toBe(true);
    expect(needsReferral(8, 5)).toBe(false);
  });
});

let dbAvailable = false;
let admin: AuthView;

try { await verifyDbConnection(2, 1000); dbAvailable = true; } catch { dbAvailable = false; }
if (dbAvailable) {
  const u = await getUserByUsername('admin');
  if (u) admin = buildAuthView(u, await getUserRoleLinks(u.id));
}
afterAll(async () => {
  if (dbAvailable) {
    const db = getDb();
    await db`DELETE FROM clinical.clinical_improvement_tasks WHERE visit_id='00000000-0000-0000-0000-000000000001'`;
    await db`DELETE FROM clinical.psych_screenings WHERE visit_id='00000000-0000-0000-0000-000000000001'`;
    await closeDbForTest();
  }
});
const R = dbAvailable ? describe : describe.skip;
R('心理筛查（真实 PG）', () => {
  it('建筛查 200 轻度不建工单', async () => {
    const r = await createScreeningView(admin, {
      visitId: '00000000-0000-0000-0000-000000000001',
      phq9Answers: [1, 1, 0, 0, 0, 0, 0, 0, 0],
      gad7Answers: [0, 0, 0, 0, 0, 0, 0],
    });
    expect(r.phq9Total).toBe(2);
    expect(r.taskId).toBeNull();
  });
  it('重度自动建 source=mental_health 工单', async () => {
    const r = await createScreeningView(admin, {
      visitId: '00000000-0000-0000-0000-000000000001',
      phq9Answers: [3, 3, 3, 3, 3, 3, 3, 0, 0],
      gad7Answers: [0, 0, 0, 0, 0, 0, 0],
    });
    expect(r.taskId).toBeTruthy();
  });
  it('越权 403', async () => {
    let status = 200;
    try {
      const fake: AuthView = { ...admin, permissions: [] };
      await createScreeningView(fake, {
        visitId: '00000000-0000-0000-0000-000000000001',
        phq9Answers: [], gad7Answers: [],
      });
    } catch (e) { if (e instanceof PsychError) status = e.status; }
    expect(status).toBe(403);
  });
});
