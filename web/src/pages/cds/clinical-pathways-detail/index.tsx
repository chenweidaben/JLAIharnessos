/** 健澜科技 jlmedaios - 临床路径详情（M377 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; pathwayName: string; disease: string; stage: string; standard: string }
export default function CdsClinicalPathwaysDetailPage() {
  usePageTitle('临床路径详情');
  const [list, setList] = useState<Row[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/cds/clinical-pathways-detail').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '路径名', dataIndex: 'pathwayName', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '病种', dataIndex: 'disease', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '阶段', dataIndex: 'stage' },
    { title: '标准', dataIndex: 'standard', ellipsis: true },
  ];
  return (<PageContainer title="临床路径详情"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无路径" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}