/**
 * 健澜科技 jlmedaios - 安全审计日志页（M183-D）
 *
 * 分页表格展示审计日志，支持按动作/结果/风险等级筛选，IP 已脱敏。
 * 深海蓝 VI：#0A2540 / #1E5F8C / #4A90D9。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Layout,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { get } from '@/services/request';

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: '#0A2540', mid: '#1E5F8C', accent: '#4A90D9', bg: '#f5f7fa' };

interface AuditLogRow {
  seq: number;
  actorName: string;
  actorRole: string;
  action: string;
  resourceType: string;
  result: string;
  riskLevel: string | null;
  clientIp: string | null;
  createdAt: string;
}

interface AuditLogPage {
  rows: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function resultColor(r: string): string {
  if (r === 'success') return 'green';
  if (r === 'denied') return 'red';
  return 'orange';
}

function riskColor(r: string | null): string {
  if (r === 'high') return 'red';
  if (r === 'medium') return 'orange';
  return 'default';
}

export default function AdminAuditLogPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState<AuditLogPage | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [action, setAction] = useState<string | undefined>();
  const [result, setResult] = useState<string | undefined>();
  const [riskLevel, setRiskLevel] = useState<string | undefined>();

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      setError('');
      try {
        const params: Record<string, string> = {
          page: String(page),
          pageSize: String(pageSize),
        };
        if (action) params.action = action;
        if (result) params.result = result;
        if (riskLevel) params.riskLevel = riskLevel;
        const resp = await get<AuditLogPage>('/api/v1/admin/audit-log', { query: params });
        if (!cancelled) setData(resp);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : '加载失败');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [page, pageSize, action, result, riskLevel]);

  const columns: ColumnsType<AuditLogRow> = [
    { title: 'Seq', dataIndex: 'seq', key: 'seq', width: 80 },
    { title: '操作人', dataIndex: 'actorName', key: 'actorName', width: 120 },
    { title: '角色', dataIndex: 'actorRole', key: 'actorRole', width: 100, render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '动作', dataIndex: 'action', key: 'action', width: 100 },
    { title: '资源', dataIndex: 'resourceType', key: 'resourceType', width: 120 },
    {
      title: '结果',
      dataIndex: 'result',
      key: 'result',
      width: 90,
      render: (v: string) => <Tag color={resultColor(v)}>{v}</Tag>,
    },
    {
      title: '风险',
      dataIndex: 'riskLevel',
      key: 'riskLevel',
      width: 90,
      render: (v: string | null) => (v ? <Tag color={riskColor(v)}>{v}</Tag> : <Text type="secondary">—</Text>),
    },
    { title: 'IP（脱敏）', dataIndex: 'clientIp', key: 'clientIp', width: 140, render: (v: string | null) => v ?? '—' },
    { title: '时间', dataIndex: 'createdAt', key: 'createdAt', width: 180 },
  ];

  return (
    <Layout style={{ minHeight: '100vh', background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ marginBottom: 16 }}>
          <Title level={3} style={{ color: VI.deep, marginBottom: 4 }}>
            安全审计日志
          </Title>
          <Paragraph type="secondary" style={{ marginBottom: 0 }}>
            哈希链防篡改 · IP 脱敏 · 多院隔离字段（hospital_id）已上线。
          </Paragraph>
        </div>

        <Card size="small" style={{ marginBottom: 16 }}>
          <Space wrap>
            <Select
              allowClear
              placeholder="动作"
              style={{ width: 120 }}
              value={action}
              onChange={(v) => { setAction(v); setPage(1); }}
              options={['login', 'read', 'write', 'export', 'approve', 'agent_invoke'].map((a) => ({ value: a, label: a }))}
            />
            <Select
              allowClear
              placeholder="结果"
              style={{ width: 120 }}
              value={result}
              onChange={(v) => { setResult(v); setPage(1); }}
              options={['success', 'denied', 'failure'].map((r) => ({ value: r, label: r }))}
            />
            <Select
              allowClear
              placeholder="风险等级"
              style={{ width: 120 }}
              value={riskLevel}
              onChange={(v) => { setRiskLevel(v); setPage(1); }}
              options={['low', 'medium', 'high'].map((r) => ({ value: r, label: r }))}
            />
            <Button type="primary" href="/api/v1/admin/audit-log/export" target="_blank">
              导出 CSV
            </Button>
          </Space>
        </Card>

        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        {loading && (
          <div style={{ textAlign: 'center', padding: 48 }}>
            <Spin size="large" />
          </div>
        )}

        {!loading && data && (
          <Card>
            <Table
              rowKey="seq"
              columns={columns}
              dataSource={data.rows}
              pagination={{
                current: data.page,
                pageSize: data.pageSize,
                total: data.total,
                onChange: (p, ps) => { setPage(p); setPageSize(ps); },
                showSizeChanger: true,
              }}
              size="small"
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
