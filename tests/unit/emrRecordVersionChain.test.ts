/**
 * 健澜科技 jlmedaios - M610 病历正文 append-only 版本链守卫单测
 *
 * 验证「建档 -> 追加修订 -> 整链校验 -> 篡改/断链/错乱识别 -> 锁定/定稿拦截 -> 物理覆盖拦截」闭环：
 * 全部为纯函数断言，不依赖数据库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { describe, expect, it } from 'bun:test';

import {
  buildCreateVersion,
  buildRevisionVersion,
  verifyVersionChain,
  lockVersion,
  signVersion,
  assertNotPhysicalOverwrite,
  hashRecordContent,
  GENESIS_VERSION_ID,
  RecordIntegrityCode,
  RecordIntegrityError,
  type RecordVersion,
} from '../../src/medical-tools/emr/RecordVersionChain';

const RECORD_ID = 'EMR-MRN-100451';

const baseEditor = { editorId: 'D001', editorName: '赵医生' };

describe('M610 病历版本链守卫', () => {
  it('建档：首版版本号 1、前序为创世哈希、状态生效、动作建档，指纹为 64 位 hex', () => {
    const v1 = buildCreateVersion(RECORD_ID, {
      ...baseEditor,
      content: '患者因胸闷 3 天入院，现病史：……',
      changeSummary: '首次入院记录',
      editedAt: '2026-10-20T08:00:00.000Z',
    });

    expect(v1.versionNo).toBe(1);
    expect(v1.prevVersionId).toBe(GENESIS_VERSION_ID);
    expect(v1.status).toBe('ACTIVE');
    expect(v1.action).toBe('CREATE');
    expect(v1.contentHash).toMatch(/^[0-9a-f]{64}$/);
    expect(v1.editorId).toBe('D001');
    expect(v1.contentSummary.length).toBeGreaterThan(0);
  });

  it('建档：空正文抛 EMPTY_CONTENT；空病历号抛 UNKNOWN_VERSION', () => {
    expect(() =>
      buildCreateVersion(RECORD_ID, { ...baseEditor, content: '   ', changeSummary: 'x' }),
    ).toThrowError(new RecordIntegrityError(RecordIntegrityCode.EMPTY_CONTENT, '病历正文不能为空'));
    expect(() =>
      buildCreateVersion('  ', { ...baseEditor, content: '正文', changeSummary: 'x' }),
    ).toThrowError(RecordIntegrityError);
  });

  it('追加修订：版本号递增、前序指向上一版、旧版本对象不可变，双链校验通过', () => {
    const v1 = buildCreateVersion(RECORD_ID, {
      ...baseEditor,
      content: '现病史段落',
      changeSummary: '首次建档',
      editedAt: '2026-10-20T08:00:00.000Z',
    });
    const v1Snapshot = { ...v1 };

    const v2 = buildRevisionVersion(v1, {
      editorId: 'D002',
      editorName: '李医生',
      content: '现病史段落 + 补充发热史',
      changeSummary: '补充现病史',
      editedAt: '2026-10-20T10:00:00.000Z',
    });

    expect(v2.versionNo).toBe(2);
    expect(v2.prevVersionId).toBe(v1.versionId);
    expect(v2.action).toBe('APPEND_REVISION');
    expect(v2.status).toBe('ACTIVE');
    // 旧版本未被改写
    expect(v1.versionNo).toBe(v1Snapshot.versionNo);
    expect(v1.contentHash).toBe(v1Snapshot.contentHash);
    expect(v1.status).toBe(v1Snapshot.status);
    expect(v1.content).toBe(v1Snapshot.content);

    const result = verifyVersionChain([v2, v1]);
    expect(result.valid).toBe(true);
    expect(result.verifiedCount).toBe(2);
  });

  it('三版完整链：乱序输入经排序后整链校验通过，verifiedCount = 3', () => {
    const v1 = buildCreateVersion(RECORD_ID, {
      ...baseEditor,
      content: '第一版正文',
      changeSummary: '建档',
      editedAt: '2026-10-20T08:00:00.000Z',
    });
    const v2 = buildRevisionVersion(v1, {
      ...baseEditor,
      content: '第二版正文（含修订）',
      changeSummary: '第一次修订',
      editedAt: '2026-10-20T10:00:00.000Z',
    });
    const v3 = buildRevisionVersion(v2, {
      editorId: 'D003',
      editorName: '陈医生',
      content: '第三版正文（上级查房）',
      changeSummary: '上级医师查房记录',
      editedAt: '2026-10-20T14:00:00.000Z',
    });

    const result = verifyVersionChain([v3, v1, v2]);
    expect(result.valid).toBe(true);
    expect(result.verifiedCount).toBe(3);
  });

  it('篡改历史正文：指纹重算不一致，识别为 HASH_MISMATCH 并定位首条失效版本', () => {
    const v1 = buildCreateVersion(RECORD_ID, {
      ...baseEditor,
      content: '原始正文 A',
      changeSummary: '建档',
      editedAt: '2026-10-20T08:00:00.000Z',
    });
    const v2 = buildRevisionVersion(v1, {
      ...baseEditor,
      content: '原始正文 B',
      changeSummary: '修订',
      editedAt: '2026-10-20T10:00:00.000Z',
    });
    // 物理篡改 v1 正文，不重算指纹
    const tampered: RecordVersion = { ...v1, content: '被篡改后的正文' };

    const result = verifyVersionChain([tampered, v2]);
    expect(result.valid).toBe(false);
    expect(result.code).toBe(RecordIntegrityCode.HASH_MISMATCH);
    expect(result.firstInvalidIndex).toBe(0);
    expect(result.reason).toContain('指纹不一致');
  });

  it('前序指针断裂：识别为 CHAIN_BROKEN', () => {
    const v1 = buildCreateVersion(RECORD_ID, {
      ...baseEditor,
      content: '正文一',
      changeSummary: '建档',
      editedAt: '2026-10-20T08:00:00.000Z',
    });
    // 人为构造第二版：版本号连续，但前序指针仍指向创世哈希，未链接到 v1（断链）
    const orphanPrev = GENESIS_VERSION_ID;
    const orphan: RecordVersion = {
      versionId: 'ver-orphan-0001',
      recordId: RECORD_ID,
      versionNo: 2,
      prevVersionId: orphanPrev,
      content: '断链正文',
      contentHash: '',
      contentSummary: '断链正文',
      editorId: 'D002',
      editorName: '李医生',
      editedAt: '2026-10-20T10:00:00.000Z',
      action: 'APPEND_REVISION',
      changeSummary: '断链',
      status: 'ACTIVE',
    };
    orphan.contentHash = hashRecordContent({
      recordId: RECORD_ID,
      versionNo: 2,
      prevVersionId: orphanPrev,
      content: orphan.content,
      editorId: 'D002',
      editedAt: orphan.editedAt,
    });

    const result = verifyVersionChain([v1, orphan]);
    expect(result.valid).toBe(false);
    expect(result.code).toBe(RecordIntegrityCode.CHAIN_BROKEN);
  });

  it('版本号重复 / 回退：识别为 VERSION_OUT_OF_ORDER', () => {
    const v1 = buildCreateVersion(RECORD_ID, {
      ...baseEditor,
      content: '正文一',
      changeSummary: '建档',
      editedAt: '2026-10-20T08:00:00.000Z',
    });
    const v2 = buildRevisionVersion(v1, {
      ...baseEditor,
      content: '正文二',
      changeSummary: '修订',
      editedAt: '2026-10-20T10:00:00.000Z',
    });
    // 人为把第二版版本号回退为 1
    const duplicated: RecordVersion = { ...v2, versionNo: 1 };

    const result = verifyVersionChain([v1, duplicated]);
    expect(result.valid).toBe(false);
    expect(result.code).toBe(RecordIntegrityCode.VERSION_OUT_OF_ORDER);
  });

  it('锁定版本禁止追加修订（EDIT_LOCKED）；已签名定稿禁止追加修订（SIGNED_FINAL）', () => {
    const v1 = buildCreateVersion(RECORD_ID, {
      ...baseEditor,
      content: '锁定前正文',
      changeSummary: '建档',
      editedAt: '2026-10-20T08:00:00.000Z',
    });
    const locked = lockVersion(v1, v1.editorId);

    expect(locked.status).toBe('LOCKED');
    expect(() =>
      buildRevisionVersion(locked, { ...baseEditor, content: '试图修订', changeSummary: '越权修订' }),
    ).toThrowError(new RecordIntegrityError(RecordIntegrityCode.EDIT_LOCKED, '病历已锁定，禁止追加修订'));

    const signed = signVersion(locked, locked.editorId, 'sig-2026-1020-001');
    expect(signed.status).toBe('SIGNED_FINAL');
    expect(signed.signature).toBe('sig-2026-1020-001');
    expect(() =>
      buildRevisionVersion(signed, { ...baseEditor, content: '定稿后改写', changeSummary: '越权定稿修订' }),
    ).toThrowError(
      new RecordIntegrityError(RecordIntegrityCode.SIGNED_FINAL, '病历已签名定稿，禁止追加修订'),
    );
  });

  it('状态迁移：重复锁定抛 EDIT_LOCKED；重复签名抛 SIGNED_FINAL；空签名抛 EMPTY_CONTENT', () => {
    const v1 = buildCreateVersion(RECORD_ID, {
      ...baseEditor,
      content: '正文',
      changeSummary: '建档',
      editedAt: '2026-10-20T08:00:00.000Z',
    });
    const locked = lockVersion(v1, v1.editorId);
    expect(locked.status).toBe('LOCKED');

    try {
      lockVersion(locked, v1.editorId);
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(RecordIntegrityError);
      expect((e as RecordIntegrityError).code).toBe(RecordIntegrityCode.EDIT_LOCKED);
    }

    const signed = signVersion(locked, locked.editorId, 'sig-001');
    expect(signed.status).toBe('SIGNED_FINAL');
    try {
      signVersion(signed, signed.editorId, 'sig-002');
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(RecordIntegrityError);
      expect((e as RecordIntegrityError).code).toBe(RecordIntegrityCode.SIGNED_FINAL);
    }

    try {
      signVersion(locked, locked.editorId, '   ');
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(RecordIntegrityError);
      expect((e as RecordIntegrityError).code).toBe(RecordIntegrityCode.EMPTY_CONTENT);
    }
  });

  it('物理覆盖拦截：改写既有版本正文即抛 PHYSICAL_OVERWRITE；同正文回写不拦截', () => {
    const v1 = buildCreateVersion(RECORD_ID, {
      ...baseEditor,
      content: '待保护正文',
      changeSummary: '建档',
      editedAt: '2026-10-20T08:00:00.000Z',
    });
    const v2 = buildRevisionVersion(v1, {
      ...baseEditor,
      content: '待保护正文（第二版）',
      changeSummary: '修订',
      editedAt: '2026-10-20T10:00:00.000Z',
    });

    // 试图覆盖 v1 正文
    expect(() => assertNotPhysicalOverwrite([v1, v2], v1.versionId, '覆盖后的新正文')).toThrowError(
      new RecordIntegrityError(
        RecordIntegrityCode.PHYSICAL_OVERWRITE,
        '禁止物理改写既有版本正文；修订只能追加新版本',
      ),
    );
    // 原样回写（未改）不抛错
    expect(() => assertNotPhysicalOverwrite([v1, v2], v1.versionId, v1.content)).not.toThrow();
    // 目标版本不存在
    try {
      assertNotPhysicalOverwrite([v1, v2], 'ver-not-exist', 'x');
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(RecordIntegrityError);
      expect((e as RecordIntegrityError).code).toBe(RecordIntegrityCode.UNKNOWN_VERSION);
    }
  });

  it('内容指纹：相同入参确定性一致；正文不同指纹不同', () => {
    const params = {
      recordId: RECORD_ID,
      versionNo: 1,
      prevVersionId: GENESIS_VERSION_ID,
      content: '指纹基线正文',
      editorId: 'D001',
      editedAt: '2026-10-20T08:00:00.000Z',
    };
    expect(hashRecordContent(params)).toBe(hashRecordContent(params));
    expect(hashRecordContent(params)).not.toBe(
      hashRecordContent({ ...params, content: '指纹差异正文' }),
    );
  });
});
