/** 健澜科技 jlmedaios - 系统配置（M347 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; configKey: string; value: string; type: string; description: string; updateTime: string }
export default function SystemConfigPage() {
  usePageTitle('系统配置');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/system/config').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '配置键', dataIndex: 'configKey', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '值', dataIndex: 'value', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '类型', dataIndex: 'type' },
    { title: '说明', dataIndex: 'description', ellipsis: true },
    { title: '更新时间', dataIndex: 'updateTime' },
  ];
  return (<PageContainer title="系统配置"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无配置" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}