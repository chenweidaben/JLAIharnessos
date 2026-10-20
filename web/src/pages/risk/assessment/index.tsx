/** 健澜科技 jlmedaios - 风险评估（M327 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; riskItem: string; level: string; likelihood: string; impact: string; measure: string }
export default function RiskAssessmentPage() {
  usePageTitle('风险评估');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/risk/assessment').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '风险项', dataIndex: 'riskItem', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '等级', dataIndex: 'level', render: (v: string) => <Tag color={v === '高风险' ? 'red' : v === '中风险' ? 'orange' : 'green'}>{v}</Tag> },
    { title: '可能性', dataIndex: 'likelihood' },
    { title: '影响', dataIndex: 'impact' },
    { title: '管控措施', dataIndex: 'measure', ellipsis: true },
  ];
  return (
    <PageContainer title="风险评估">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无评估" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}