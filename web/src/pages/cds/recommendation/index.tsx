/** 健澜科技 jlmedaios - 临床推荐（M340 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; recNo: string; type: string; content: string; basis: string; level: string }
export default function CdsRecommendationPage() {
  usePageTitle('临床推荐');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/cds/recommendation').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '推荐号', dataIndex: 'recNo', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '类型', dataIndex: 'type' },
    { title: '内容', dataIndex: 'content', ellipsis: true },
    { title: '依据', dataIndex: 'basis', ellipsis: true },
    { title: '级别', dataIndex: 'level', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (<PageContainer title="临床推荐"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无推荐" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}