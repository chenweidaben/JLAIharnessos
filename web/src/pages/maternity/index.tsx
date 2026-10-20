/** 健澜科技 jlmedaios - 分娩记录（M238 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; mother: string; gestationalWeeks: number; method: string; newbornWeight: number; apgar: number; doctor: string }
export default function MaternityPage() {
  usePageTitle('分娩记录');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/maternity/delivery').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.deliveries ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '产妇', dataIndex: 'mother' },
    { title: '孕周', dataIndex: 'gestationalWeeks', render: (v: number) => `${v} 周` },
    { title: '分娩方式', dataIndex: 'method', render: (v: string) => <Tag color={v === '顺产' ? 'green' : 'blue'}>{v}</Tag> },
    { title: '新生儿体重(g)', dataIndex: 'newbornWeight' },
    { title: 'Apgar', dataIndex: 'apgar', render: (v: number) => <Tag color={v >= 8 ? 'green' : 'orange'}>{v}</Tag> },
    { title: '助产医生', dataIndex: 'doctor' },
  ];
  return (
    <PageContainer title="分娩记录">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无记录" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
