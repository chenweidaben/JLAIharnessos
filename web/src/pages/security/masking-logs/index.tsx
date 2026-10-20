/** 健澜科技 jlmedaios - 脱敏日志（M366 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; logId: string; field: string; operator: string; time: string }
export default function SecurityMaskingLogsPage() {
  usePageTitle('脱敏日志');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/security/masking-logs').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '日志号', dataIndex: 'logId', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '字段', dataIndex: 'field', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '操作人', dataIndex: 'operator' },
    { title: '时间', dataIndex: 'time' },
  ];
  return (<PageContainer title="脱敏日志"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无日志" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}