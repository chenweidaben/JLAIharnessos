/** 健澜科技 jlmedaios - 审计导出（M345 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; exportId: string; range: string; format: string; exporter: string; time: string }
export default function SecurityAuditExportPage() {
  usePageTitle('审计导出');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/security/audit-export').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '导出号', dataIndex: 'exportId', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '范围', dataIndex: 'range' },
    { title: '格式', dataIndex: 'format', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '导出人', dataIndex: 'exporter' },
    { title: '时间', dataIndex: 'time' },
  ];
  return (<PageContainer title="审计导出"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无导出" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}