/** 健澜科技 jlmedaios - ICU 监护（M312 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; bed: string; heartRate: string; bloodPressure: string; oxygenSaturation: string; ventilator: string; status: string }
export default function IcuMonitorPage() {
  usePageTitle('ICU 监护');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/icu/monitor').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.monitors ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '床位', dataIndex: 'bed', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '心率', dataIndex: 'heartRate' },
    { title: '血压', dataIndex: 'bloodPressure', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: 'SpO2', dataIndex: 'oxygenSaturation', render: (v: string) => parseFloat(v) < 90 ? <Tag color="red">{v}</Tag> : v },
    { title: '呼吸机', dataIndex: 'ventilator' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '稳定' ? 'green' : v === '观察中' ? 'orange' : 'red'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="ICU 监护">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无监护" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}