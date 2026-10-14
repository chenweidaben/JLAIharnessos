/**
 * 健澜科技 jlmedaios - MEDMUSE 审批中心（Sentinel 人在回路审批台）
 *
 * 待审批工单 Table：工单ID / 工具名 / 申请人 / 风险级 Tag（warning=橙 critical=红）/ 创建时间；
 * 行内「通过 / 驳回」，驳回弹窗必填理由；操作后自动刷新列表。
 * 顶部状态筛选：pending（待审批）/ approved（已通过）/ rejected（已驳回）。
 * 深海蓝 VI：标题栏 #0A2540，主按钮 #4A90D9。
 *
 * 后端权限码：medmuse:chat（GET 列表 与 POST decide 共用，见 src/bff/routes/medmuse.ts）。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert, Button, Card, Empty, Input, Layout, Modal, Popconfirm, Space, Table, Tag, Tabs, Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  useMedmuseApprovalStore,
} from '@/store/medmuseApprovalStore';
import type { ApprovalStatus, MedmuseApproval } from '@/services/api/medmuse';

const { Header, Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;

/** 风险级标签：warning=橙，critical=红，info=蓝 */
const RISK_TAG: Record<string, { color: string; label: string }> = {
  info: { color: 'blue', label: 'info 只读' },
  warning: { color: 'orange', label: 'warning 橙' },
  critical: { color: 'red', label: 'critical 红' },
};

/** ISO 时间简化展示：2026-10-14T08:30:00Z -> 2026-10-14 08:30 */
function fmtTime(iso: string | null): string {
  if (!iso) return '-';
  return iso.replace('T', ' ').slice(0, 16);
}

export default function MedmuseApprovalsPage() {
  const { list, status, loading, deciding, error, setStatus, load, decide } = useMedmuseApprovalStore();

  // 行内操作态（哪个按钮在 loading）
  const [actingId, setActingId] = useState<string | null>(null);
  // 驳回弹窗
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const handleApprove = async (id: string) => {
    setActingId(id);
    await decide(id, true);
    setActingId(null);
  };

  const openReject = (id: string) => {
    setRejectingId(id);
    setReason('');
    setReasonError(null);
  };

  const handleRejectOk = async () => {
    const text = reason.trim();
    if (!text) {
      setReasonError('驳回理由必填');
      return;
    }
    if (!rejectingId) return;
    setActingId(rejectingId);
    const ok = await decide(rejectingId, false, text);
    setActingId(null);
    if (ok) {
      setRejectingId(null);
      setReason('');
    }
  };

  const columns: ColumnsType<MedmuseApproval> = [
    {
      title: '工单ID',
      dataIndex: 'id',
      key: 'id',
      width: 220,
      render: (v: string) => <span style={{ fontFamily: 'monospace', fontSize: 12 }}>{v}</span>,
    },
    {
      title: '工具名',
      key: 'toolName',
      render: (_, r) => r.action?.toolName ?? '-',
    },
    {
      title: '申请人',
      dataIndex: 'requested_by',
      key: 'requested_by',
      render: (v: string | null) => v ?? '-',
    },
    {
      title: '风险级',
      dataIndex: 'risk_level',
      key: 'risk_level',
      width: 120,
      render: (v: string) => {
        const t = RISK_TAG[v] ?? { color: 'default', label: v };
        return <Tag color={t.color}>{t.label}</Tag>;
      },
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 160,
      render: (v: string) => fmtTime(v),
    },
    {
      title: '操作',
      key: 'op',
      width: 180,
      render: (_, record) => {
        if (record.status !== 'pending') {
          const text =
            record.status === 'approved' ? '已通过'
            : record.status === 'rejected' ? '已驳回'
            : '已过期';
          return <span style={{ color: '#8c8c8c' }}>{text}</span>;
        }
        return (
          <Space>
            <Popconfirm
              title="确认通过该审批工单？"
              description={record.action?.toolName ? `工具：${record.action.toolName}` : undefined}
              okText="通过"
              cancelText="取消"
              onConfirm={() => void handleApprove(record.id)}
            >
              <Button
                type="primary"
                size="small"
                style={{ background: '#4A90D9', borderColor: '#4A90D9' }}
                loading={deciding && actingId === record.id}
              >
                通过
              </Button>
            </Popconfirm>
            <Button
              size="small"
              danger
              loading={deciding && actingId === record.id}
              onClick={() => openReject(record.id)}
            >
              驳回
            </Button>
          </Space>
        );
      },
    },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ background: '#0A2540' }}>
        <Title level={4} style={{ color: '#fff', margin: '14px 0' }}>MEDMUSE 审批中心</Title>
      </Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}

        <Card>
          <Tabs
            activeKey={status}
            onChange={(k) => setStatus(k as ApprovalStatus)}
            items={[
              { key: 'pending', label: '待审批' },
              { key: 'approved', label: '已通过' },
              { key: 'rejected', label: '已驳回' },
            ]}
          />
          <Table
            rowKey="id"
            size="small"
            loading={loading}
            columns={columns}
            dataSource={list}
            pagination={false}
            locale={{ emptyText: <Empty description="暂无审批工单" /> }}
          />
        </Card>

        <Modal
          title="驳回审批工单"
          open={!!rejectingId}
          okText="确认驳回"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          confirmLoading={deciding}
          onCancel={() => setRejectingId(null)}
          onOk={() => void handleRejectOk()}
        >
          <p style={{ marginBottom: 8 }}>驳回理由将写入工单 rejection_reason，必填：</p>
          <TextArea
            rows={4}
            value={reason}
            maxLength={500}
            showCount
            placeholder="请输入驳回理由"
            onChange={(e) => {
              setReason(e.target.value);
              if (e.target.value.trim()) setReasonError(null);
            }}
          />
          {reasonError && <div style={{ color: '#cf1322', marginTop: 4 }}>{reasonError}</div>}
        </Modal>
      </Content>
    </Layout>
  );
}
