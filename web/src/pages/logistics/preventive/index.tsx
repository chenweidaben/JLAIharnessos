/** 健澜科技 jlmedaios - 预防保健（M316 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; project: string; target: string; count: string; time: string; manager: string }
export default function LogisticsPreventivePage() {
  usePageTitle('预防保健');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/logistics/preventive').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '项目', dataIndex: 'project', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '目标人群', dataIndex: 'target' },
    { title: '完成情况', dataIndex: 'count' },
    { title: '时间', dataIndex: 'time' },
    { title: '负责部门', dataIndex: 'manager' },
  ];
  return (
    <PageContainer title="预防保健">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无预防项目" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}