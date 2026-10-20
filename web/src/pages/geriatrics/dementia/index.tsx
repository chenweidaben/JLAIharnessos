/** 健澜科技 jlmedaios - 认知障碍（M353 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; screeningTool: string; score: string; grade: string }
export default function GeriatricsDementiaPage() {
  usePageTitle('认知障碍');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/geriatrics/dementia').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '筛查工具', dataIndex: 'screeningTool' },
    { title: '得分', dataIndex: 'score', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '分级', dataIndex: 'grade', render: (v: string) => <Tag color={v.includes('轻度') ? 'orange' : v.includes('中度') ? 'red' : 'green'}>{v}</Tag> },
  ];
  return (<PageContainer title="认知障碍"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无障碍" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}