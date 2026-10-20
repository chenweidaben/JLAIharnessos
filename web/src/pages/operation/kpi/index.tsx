/** 健澜科技 jlmedaios - KPI 指标（M323 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { metric: string; today: string; month: string }
export default function OperationKpiPage() {
  usePageTitle('KPI 指标');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/operation/kpi').then((r) => r.json())
      .then((j) => {
        if (!alive || !j.data) return;
        const t = j.data.today ?? {}; const m = j.data.month ?? {};
        setList([
          { metric: '门诊量', today: `${t.outpatient ?? 0} 人次`, month: `${m.outpatient ?? 0} 人次` },
          { metric: '出院人数', today: `${t.discharged ?? 0} 人`, month: `${m.discharged ?? 0} 人` },
          { metric: '平均住院日', today: `${t.avgStay ?? 0} 天`, month: `${m.avgStay ?? 0} 天` },
          { metric: '床位周转', today: `${t.bedTurnover ?? 0}`, month: `${m.bedTurnover ?? 0}` },
          { metric: '手术量', today: `${t.surgeries ?? 0} 台`, month: `${m.surgeries ?? 0} 台` },
        ]);
      })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '指标', dataIndex: 'metric', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '今日', dataIndex: 'today', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '本月', dataIndex: 'month', render: (v: string) => <Tag color="green">{v}</Tag> },
  ];
  return (
    <PageContainer title="KPI 指标">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="metric" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}