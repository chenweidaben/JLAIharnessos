/** 健澜科技 jlmedaios - 版本信息（M364 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; version: string; publishTime: string; updateContent: string }
export default function SystemVersionPage() {
  usePageTitle('版本信息');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/system/version').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '版本', dataIndex: 'version', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '发布时间', dataIndex: 'publishTime', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '更新内容', dataIndex: 'updateContent', ellipsis: true },
  ];
  return (<PageContainer title="版本信息"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无版本" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}