/** 健澜科技 jlmedaios - 质量控制（M327 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; project: string; standard: string; result: string; judgment: string; time: string }
export default function QualityControlPage() {
  usePageTitle('质量控制');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/quality/control').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '项目', dataIndex: 'project', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '标准', dataIndex: 'standard' },
    { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '判定', dataIndex: 'judgment', render: (v: string) => <Tag color={v === '合格' ? 'green' : 'red'}>{v}</Tag> },
    { title: '时间', dataIndex: 'time' },
  ];
  return (
    <PageContainer title="质量控制">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}