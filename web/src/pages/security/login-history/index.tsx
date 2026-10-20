/** 健澜科技 jlmedaios - 登录历史（M346 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; user: string; loginTime: string; ip: string; device: string; status: string }
export default function SecurityLoginHistoryPage() {
  usePageTitle('登录历史');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/security/login-history').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '用户', dataIndex: 'user' },
    { title: '登录时间', dataIndex: 'loginTime', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'IP', dataIndex: 'ip', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '设备', dataIndex: 'device' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v.includes('成功') ? 'green' : 'red'}>{v}</Tag> },
  ];
  return (<PageContainer title="登录历史"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无历史" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}