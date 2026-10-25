/** 健澜科技 jlmedaios - 系统日志（M364 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; logId: string; level: string; module: string; content: string }
export default function SystemLogsPage() {
  usePageTitle('系统日志');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/system/logs').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '日志号', dataIndex: 'logId', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '级别', dataIndex: 'level', render: (v: string) => <Tag color={v.includes('ERROR') ? 'red' : v.includes('WARN') ? 'orange' : 'blue'}>{v}</Tag> },
    { title: '模块', dataIndex: 'module' },
    { title: '内容', dataIndex: 'content', ellipsis: true },
  ];
  return (<PageContainer title="系统日志"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无日志" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}