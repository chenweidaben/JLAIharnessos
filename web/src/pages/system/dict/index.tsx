/** 健澜科技 jlmedaios - 数据字典（M347 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; dictName: string; code: string; value: string; sort: number; status: string }
export default function SystemDictPage() {
  usePageTitle('数据字典');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/system/dict').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '字典名', dataIndex: 'dictName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '编码', dataIndex: 'code', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '值', dataIndex: 'value', ellipsis: true },
    { title: '排序', dataIndex: 'sort' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '启用' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (<PageContainer title="数据字典"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无字典" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}