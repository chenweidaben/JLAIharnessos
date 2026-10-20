/** 健澜科技 jlmedaios - 护理 NQI 指标（M270 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; dept: string; thisMonth: string; target: string; compliance: string }
export default function NursingNqiScoresPage() {
  usePageTitle('护理 NQI 指标');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/nursing/nqi-scores').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.indicators ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '指标', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '范围', dataIndex: 'dept' },
    { title: '本月', dataIndex: 'thisMonth' },
    { title: '目标', dataIndex: 'target' },
    { title: '达标', dataIndex: 'compliance', render: (v: string) => <Tag color={v === '达标' ? 'green' : 'red'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="护理敏感质量指标 NQI">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
