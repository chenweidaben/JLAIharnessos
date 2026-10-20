/** 健澜科技 jlmedaios - 数据访问日志（M346 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; user: string; dataType: string; operation: string; time: string; source: string }
export default function SecurityDataAccessLogPage() {
  usePageTitle('数据访问日志');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/security/data-access-log').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '用户', dataIndex: 'user' },
    { title: '数据类型', dataIndex: 'dataType', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '操作', dataIndex: 'operation', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '时间', dataIndex: 'time' },
    { title: '来源', dataIndex: 'source', ellipsis: true },
  ];
  return (<PageContainer title="数据访问日志"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无日志" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}