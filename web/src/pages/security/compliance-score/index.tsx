/** 健澜科技 jlmedaios - 合规评分（M345 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; dimension: string; score: string; maxScore: string; rate: string; trend: string }
export default function SecurityComplianceScorePage() {
  usePageTitle('合规评分');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { let alive = true; setLoading(true); fetch('/api/v1/security/compliance-score').then((r) => r.json()).then((j) => { if (alive) setList(j.data?.items ?? []); }).catch((e: Error) => { if (alive) setError(e.message); }).finally(() => { if (alive) setLoading(false); }); return () => { alive = false; }; }, []);
  const columns: ColumnsType<Row> = [
    { title: '维度', dataIndex: 'dimension', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '得分', dataIndex: 'score', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '满分', dataIndex: 'maxScore' },
    { title: '达标率', dataIndex: 'rate', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '趋势', dataIndex: 'trend' },
  ];
  return (<PageContainer title="合规评分"><Spin spinning={loading}>{error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}<Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无评分" /> }} pagination={{ pageSize: 10 }} /></Card></Spin></PageContainer>);
}