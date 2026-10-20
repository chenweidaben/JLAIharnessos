/** 健澜科技 jlmedaios - 审计异常（M345 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; anomalyId: string; type: string; description: string; riskLevel: string; status: string }
export default function SecurityAuditAnomalyPage() {
  usePageTitle('审计异常');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/security/audit-anomaly').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '异常号', dataIndex: 'anomalyId', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '类型', dataIndex: 'type', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '描述', dataIndex: 'description', ellipsis: true },
    { title: '风险等级', dataIndex: 'riskLevel', render: (v: string) => <Tag color="orange">{v}</Tag> },
    { title: '状态', dataIndex: 'status' },
  ];
  return (<PageContainer title="审计异常"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无异常" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}