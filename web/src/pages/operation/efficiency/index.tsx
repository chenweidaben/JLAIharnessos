/** 健澜科技 jlmedaios - 效率分析（M323 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { dept: string; avgStay: string; bedTurnover: string; avgSurgeryTime: string; efficiencyScore: string }
export default function OperationEfficiencyPage() {
  usePageTitle('效率分析');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/operation/efficiency').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '平均住院日', dataIndex: 'avgStay', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '床位周转', dataIndex: 'bedTurnover' },
    { title: '平均手术时长', dataIndex: 'avgSurgeryTime' },
    { title: '效率等级', dataIndex: 'efficiencyScore', render: (v: string) => <Tag color={v.startsWith('A') ? 'green' : v.startsWith('B') ? 'blue' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="效率分析">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="dept" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}