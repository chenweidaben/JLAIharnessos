/** 健澜科技 jlmedaios - DIP 分值（M320 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; disease: string; dipScore: string; costIndex: string; performance: string; dept: string }
export default function DipScorePage() {
  usePageTitle('DIP 分值');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/dip/score').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '病种', dataIndex: 'disease', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: 'DIP 分值', dataIndex: 'dipScore', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '费用指数', dataIndex: 'costIndex' },
    { title: '科室', dataIndex: 'dept' },
    { title: '盈亏', dataIndex: 'performance', render: (v: string) => <Tag color={v === '盈利' ? 'green' : v === '亏损' ? 'red' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="DIP 分值">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}