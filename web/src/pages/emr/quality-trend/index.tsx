/** 健澜科技 jlmedaios - 病历质控趋势（M269 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { month: string; gradeA: string; gradeB: string; gradeC: string }
export default function EmrQualityTrendPage() {
  usePageTitle('病历质控趋势');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/emr/quality-trend').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.trend ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '月份', dataIndex: 'month', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '甲级率', dataIndex: 'gradeA', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '乙级率', dataIndex: 'gradeB' },
    { title: '丙级率', dataIndex: 'gradeC', render: (v: string) => <Tag color="red">{v}</Tag> },
  ];
  return (
    <PageContainer title="病历质控月度趋势">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="month" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无趋势" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
