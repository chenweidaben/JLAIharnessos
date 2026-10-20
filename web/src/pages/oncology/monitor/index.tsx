/** 健澜科技 jlmedaios - 肿瘤监测（M334 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; indicator: string; result: string; reference: string; time: string }
export default function OncologyMonitorPage() {
  usePageTitle('肿瘤监测');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/oncology/monitor').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '指标', dataIndex: 'indicator', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '参考范围', dataIndex: 'reference', ellipsis: true },
    { title: '时间', dataIndex: 'time', render: (v: string) => <Tag color="blue">{v}</Tag> },
  ];
  return (
    <PageContainer title="肿瘤监测">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无监测数据" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}