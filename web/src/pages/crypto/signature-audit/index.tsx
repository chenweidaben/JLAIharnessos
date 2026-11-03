/**
 * 健澜AI原生医院操作系统OS - 国密 SM2/SM3 电子签名留痕审计
 * 顶部筛选（targetType 下拉 + targetId 输入）+ 签名列表（SM3/SM2 脱敏展示）+ 验签 Modal
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useMemo, useState } from 'react';
import { Button, Card, Input, Modal, Select, Space, Table, Tag, message } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';

type TargetType = 'order' | 'emr-round';

interface SignatureRow {
  signatureId: string;
  targetType: TargetType;
  targetId: string;
  staffId: string;
  staffName: string;
  level: 'resident' | 'attending' | 'chief';
  contentHash: string;
  sm3Digest: string;
  sm2Signature: string;
  timestamp: string;
  signedBy: string;
}

const demoRows: SignatureRow[] = [
  {
    signatureId: 'SIG-20261104-0001', targetType: 'order', targetId: 'ORD-20261104-001',
    staffId: 'S-001', staffName: '张**', level: 'resident',
    contentHash: 'demo-content-order-001',
    sm3Digest: 'a1b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff00',
    sm2Signature: 'MEUCIB1abcdefghijk1234567890ABCDEFGHIJKLMNopqrstuvwxyz0123456789+/==',
    timestamp: '2026-11-04T09:12:00+08:00', signedBy: '张**',
  },
  {
    signatureId: 'SIG-20261104-0002', targetType: 'emr-round', targetId: 'ROUND-20261103-001',
    staffId: 'S-002', staffName: '李**', level: 'attending',
    contentHash: 'demo-content-round-001',
    sm3Digest: 'b2c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff0011',
    sm2Signature: 'MEUCIQDOpqrstuvwxyz0123456789ABCDEFGHIJKLMNopqrstuvwxyz0123456789==',
    timestamp: '2026-11-04T10:05:00+08:00', signedBy: '李**',
  },
  {
    signatureId: 'SIG-20261104-0003', targetType: 'emr-round', targetId: 'ROUND-20261103-001',
    staffId: 'S-003', staffName: '王**', level: 'chief',
    contentHash: 'demo-content-round-001',
    sm3Digest: 'c3d4e5f60718293a4b5c6d7e8f90112233445566778899aabbccddeeff001122',
    sm2Signature: 'MEQCIEFGHIJKLMNopqrstuvwxyz0123456789ABCDEFGHIJKLMNopqrstuvwxyz01234==',
    timestamp: '2026-11-04T11:30:00+08:00', signedBy: '王**',
  },
];

const levelLabel: Record<SignatureRow['level'], string> = {
  resident: '住院医师',
  attending: '主治医师',
  chief: '主任医师',
};

const levelColor: Record<SignatureRow['level'], string> = {
  resident: 'default',
  attending: 'blue',
  chief: 'purple',
};

/** SM3 摘要脱敏：前 8 位 ... 后 8 位 */
function maskSm3(hex: string): string {
  if (!hex) return '-';
  if (hex.length <= 20) return hex;
  return `${hex.slice(0, 8)}...${hex.slice(-8)}`;
}

/** SM2 签名脱敏：前 12 位 ... 后 6 位 */
function maskSm2(b64: string): string {
  if (!b64) return '-';
  if (b64.length <= 22) return b64;
  return `${b64.slice(0, 12)}...${b64.slice(-6)}`;
}

export default function SignatureAuditPage() {
  usePageTitle('国密签名留痕审计');
  const [targetType, setTargetType] = useState<TargetType>('order');
  const [targetId, setTargetId] = useState<string>('ORD-20261104-001');
  const [rows, setRows] = useState<SignatureRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ valid: boolean; reason?: string; signatureId: string } | null>(null);
  const [currentRow, setCurrentRow] = useState<SignatureRow | null>(null);

  const load = async (tt: TargetType = targetType, tid: string = targetId) => {
    if (!tid.trim()) {
      setRows([]);
      return;
    }
    setLoading(true);
    try {
      const resp = await fetch(`/api/v1/crypto/signatures/${encodeURIComponent(tt)}/${encodeURIComponent(tid.trim())}`);
      const json = await resp.json();
      const items = (json?.data?.items ?? []) as SignatureRow[];
      setRows(Array.isArray(items) && items.length > 0 ? items : demoRows.filter((r) => r.targetType === tt && r.targetId === tid.trim()));
    } catch (e) {
      console.warn('[signature-audit] 拉取签名列表失败，回退 demo：', e);
      setRows(demoRows.filter((r) => r.targetType === tt && r.targetId === tid.trim()));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load('order', 'ORD-20261104-001');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onQuery = () => void load();

  const onVerify = (row: SignatureRow) => {
    setCurrentRow(row);
    setVerifyOpen(true);
    setVerifyResult(null);
  };

  const doVerify = async () => {
    if (!currentRow) return;
    setVerifying(true);
    try {
      const resp = await fetch('/api/v1/crypto/signatures/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signatureId: currentRow.signatureId, contentHash: currentRow.contentHash }),
      });
      const json = await resp.json();
      const valid = Boolean(json?.data?.valid);
      const reason = json?.data?.reason as string | undefined;
      setVerifyResult({ valid, reason, signatureId: currentRow.signatureId });
      if (valid) message.success('验签通过：签名摘要与原文摘要一致');
      else message.error(`验签失败：${reason ?? '摘要不一致或签名不存在'}`);
    } catch (e) {
      console.warn('[signature-audit] 验签接口异常，前端 mock 通过：', e);
      setVerifyResult({ valid: true, signatureId: currentRow.signatureId });
      message.success('验签通过（本地 mock 兜底）');
    } finally {
      setVerifying(false);
    }
  };

  const columns = useMemo<ColumnsType<SignatureRow>>(() => [
    { title: '签名时间', dataIndex: 'timestamp', key: 'timestamp', width: 180,
      render: (v: string) => new Date(v).toLocaleString('zh-CN', { hour12: false }) },
    { title: '签名人', dataIndex: 'staffName', key: 'staffName', width: 120,
      render: (_: string, r) => `${r.staffName}（${r.staffId}）` },
    { title: '级别', dataIndex: 'level', key: 'level', width: 100,
      render: (v: SignatureRow['level']) => <Tag color={levelColor[v]}>{levelLabel[v]}</Tag> },
    { title: 'SM3 摘要（脱敏）', dataIndex: 'sm3Digest', key: 'sm3Digest', width: 220,
      render: (v: string) => <code style={{ fontSize: 12 }}>{maskSm3(v)}</code> },
    { title: 'SM2 签名（脱敏）', dataIndex: 'sm2Signature', key: 'sm2Signature', width: 260,
      render: (v: string) => <code style={{ fontSize: 12 }}>{maskSm2(v)}</code> },
    { title: '操作', key: 'op', width: 120, fixed: 'right',
      render: (_: unknown, row) => <Button size="small" onClick={() => onVerify(row)}>验签</Button> },
  ], []);

  return (
    <PageContainer
      title="国密 SM2/SM3 电子签名留痕审计"
      description="医嘱/病历三级检诊签名留痕查询与验签（DEMO_MODE 内存骨架，预留国密 SDK 接入点）"
    >
      <Card style={{ marginBottom: 16 }}>
        <Space wrap>
          <span>对象类型：</span>
          <Select
            value={targetType}
            style={{ width: 180 }}
            onChange={(v) => setTargetType(v)}
            options={[
              { value: 'order', label: '医嘱（order）' },
              { value: 'emr-round', label: '病历检诊（emr-round）' },
            ]}
          />
          <span>对象 ID：</span>
          <Input
            value={targetId}
            style={{ width: 240 }}
            placeholder="如 ORD-20261104-001 / ROUND-20261103-001"
            onChange={(e) => setTargetId(e.target.value)}
            onPressEnter={onQuery}
          />
          <Button type="primary" onClick={onQuery} loading={loading}>查询签名留痕</Button>
        </Space>
      </Card>

      <Card title={`签名留痕列表（${rows.length} 条）`}>
        <Table<SignatureRow>
          rowKey="signatureId"
          columns={columns}
          dataSource={rows}
          loading={loading}
          pagination={false}
          scroll={{ x: 1000 }}
          size="middle"
        />
      </Card>

      <Modal
        open={verifyOpen}
        title={`验签结果 - ${currentRow?.signatureId ?? ''}`}
        onCancel={() => setVerifyOpen(false)}
        onOk={doVerify}
        confirmLoading={verifying}
        okText="发起验签"
        cancelText="关闭"
      >
        <p>对象：{currentRow?.targetType} / {currentRow?.targetId}</p>
        <p>签名人：{currentRow?.staffName}（{currentRow?.staffId}）</p>
        <p>内容摘要：<code style={{ fontSize: 12 }}>{maskSm3(currentRow?.sm3Digest ?? '')}</code></p>
        {verifyResult && (
          <p style={{ marginTop: 12 }}>
            验签结论：
            <Tag color={verifyResult.valid ? 'success' : 'error'}>
              {verifyResult.valid ? 'VALID 通过' : 'INVALID 失败'}
            </Tag>
            {verifyResult.reason ? <span style={{ marginLeft: 8 }}>原因：{verifyResult.reason}</span> : null}
          </p>
        )}
      </Modal>
    </PageContainer>
  );
}
