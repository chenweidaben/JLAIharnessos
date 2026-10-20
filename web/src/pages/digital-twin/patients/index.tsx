/** 健澜科技 jlmedaios - 数字孪生患者（M320 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; model: string; status: string; lastRun: string; purpose: string }
export default function DigitalTwinPatientsPage() {
  usePageTitle('数字孪生患者');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/digital-twin/patients').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '虚拟患者', dataIndex: 'patient', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '模型', dataIndex: 'model' },
    { title: '用途', dataIndex: 'purpose' },
    { title: '最近运行', dataIndex: 'lastRun' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已校准' ? 'green' : v === '训练中' ? 'blue' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="数字孪生患者">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无模型" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}