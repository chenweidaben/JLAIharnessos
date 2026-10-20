/** 健澜科技 jlmedaios - 质量异常（M327 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; item: string; desc: string; cause: string; measure: string; status: string }
export default function QualityExceptionPage() {
  usePageTitle('质量异常');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/quality/exception').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '异常项', dataIndex: 'item', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '描述', dataIndex: 'desc', ellipsis: true },
    { title: '原因', dataIndex: 'cause', ellipsis: true },
    { title: '措施', dataIndex: 'measure', ellipsis: true },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已闭环' ? 'green' : v === '整改中' ? 'orange' : 'red'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="质量异常">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无异常" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}