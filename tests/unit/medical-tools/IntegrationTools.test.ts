/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 单元测试 - 系统集成类工具（sync_to_his / fetch_from_emr / hl7_message_send）
 */

import { describe, it, expect } from 'bun:test';
import { emptyCtx } from './helpers.js';
import { syncToHisTool } from '@/medical-tools/integration/syncToHIS.js';
import { fetchFromEmrTool } from '@/medical-tools/integration/fetchFromEMR.js';
import { hl7MessageSendTool } from '@/medical-tools/integration/hl7MessageSend.js';

describe('sync_to_his 同步数据到HIS', () => {
  it('同步患者信息应成功并返回HIS记录ID与校验结果', async () => {
    const res = await syncToHisTool.execute(
      {
        dataType: '患者信息',
        dataContent: { name: '张建国', dept: '心血管内科' },
        syncMode: '实时',
        patientId: 'P2026090001',
      },
      emptyCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as {
      hisRecordId: string;
      syncTime: string;
      validation: { passed: boolean; checks: unknown[] };
    };
    expect(data.hisRecordId).toBeTruthy();
    expect(data.syncTime).toBeTruthy();
    expect(data.validation.passed).toBe(true);
    expect(data.validation.checks.length).toBeGreaterThan(0);
  });

  it('费用同步可无患者ID', async () => {
    const res = await syncToHisTool.execute(
      {
        dataType: '费用',
        dataContent: { total: 1200 },
        syncMode: '批量',
      },
      emptyCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as { syncMode: string; hisRecordId: string };
    expect(data.syncMode).toBe('批量');
    expect(data.hisRecordId).toBeTruthy();
  });

  it('未知患者应在校验中标记但仍返回同步结果', async () => {
    const res = await syncToHisTool.execute(
      {
        dataType: '医嘱',
        dataContent: { order: '血常规' },
        syncMode: '实时',
        patientId: 'P_NOT_EXIST',
      },
      emptyCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as { validation: { passed: boolean } };
    expect(data.validation.passed).toBe(false);
  });
});

describe('fetch_from_emr 从EMR获取数据', () => {
  it('已知患者应返回病历列表且姓名脱敏', async () => {
    const res = await fetchFromEmrTool.execute(
      { patientId: 'P2026090001', dataType: '门诊病历' },
      emptyCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as {
      total: number;
      patientNameMasked: string;
      records: { recordId: string; summary: string }[];
    };
    expect(data.total).toBeGreaterThan(0);
    expect(data.patientNameMasked).toContain('张');
    expect(data.records.length).toBeGreaterThan(0);
  });

  it('不存在的患者应返回错误', async () => {
    const res = await fetchFromEmrTool.execute(
      { patientId: 'P_NOT_EXIST', dataType: '门诊病历' },
      emptyCtx,
    );
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('PATIENT_NOT_FOUND');
  });

  it('支持按就诊ID筛选病历', async () => {
    const res = await fetchFromEmrTool.execute(
      { patientId: 'P2026090001', dataType: '门诊病历', encounterId: 'E20260912001' },
      emptyCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as { records: { recordId: string }[] };
    expect(data.records.length).toBeGreaterThanOrEqual(1);
  });
});

describe('hl7_message_send 发送HL7消息', () => {
  it('ADT^A01带患者ID应返回AA应答', async () => {
    const res = await hl7MessageSendTool.execute(
      {
        messageType: 'ADT',
        messageTrigger: 'A01',
        messageContent: { patientId: 'P2026090001', patientName: '张建国' },
        targetSystem: 'HIS',
      },
      emptyCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as {
      messageControlId: string;
      ackCode: string;
      ackMessage: string;
      responseTimeMs: number;
      messagePreview: string;
    };
    expect(data.messageControlId).toBeTruthy();
    expect(data.ackCode).toBe('AA');
    expect(data.messagePreview).toContain('MSH');
  });

  it('ADT类消息缺少患者ID应被拒绝(AR)', async () => {
    const res = await hl7MessageSendTool.execute(
      {
        messageType: 'ADT',
        messageTrigger: 'A04',
        messageContent: { patientName: '未知' },
        targetSystem: 'HIS',
      },
      emptyCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as { ackCode: string; ackMessage: string };
    expect(data.ackCode).toBe('AR');
    expect(data.ackMessage).toContain('患者ID');
  });

  it('ORU检验结果消息应正常发送', async () => {
    const res = await hl7MessageSendTool.execute(
      {
        messageType: 'ORU',
        messageTrigger: 'R01',
        messageContent: { patientId: 'P2026090002', orderId: 'O20260910005', testName: '血常规', note: 'WBC 12.5' },
        targetSystem: 'LIS',
      },
      emptyCtx,
    );
    expect(res.success).toBe(true);
    const data = res.data as { ackCode: string; status: string };
    expect(data.ackCode).toBe('AA');
    expect(data.status).toBe('已确认');
  });
});
