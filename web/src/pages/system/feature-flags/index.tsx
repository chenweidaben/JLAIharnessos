/** 健澜科技 jlmedaios - 功能开关（M347 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; flagName: string; status: string; description: string; scope: string; updateTime: string }
export default function SystemFeatureFlagsPage() {
  usePageTitle('功能开关');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/system/feature-flags').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '开关名', dataIndex: 'flagName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '开启' ? 'green' : 'red'}>{v}</Tag> },
    { title: '说明', dataIndex: 'description', ellipsis: true },
    { title: '范围', dataIndex: 'scope' },
    { title: '更新时间', dataIndex: 'updateTime' },
  ];
  return (<PageContainer title="功能开关"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无开关" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}