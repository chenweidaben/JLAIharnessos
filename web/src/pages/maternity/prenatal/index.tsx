/** 健澜科技 jlmedaios - 产前检查（M332 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; mother: string; gestationalWeek: string; examItems: string; result: string; doctor: string }
export default function MaternityPrenatalPage() {
  usePageTitle('产前检查');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/maternity/prenatal').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '产妇', dataIndex: 'mother', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '孕周', dataIndex: 'gestationalWeek', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '检查项目', dataIndex: 'examItems' },
    { title: '结果', dataIndex: 'result', ellipsis: true },
    { title: '医生', dataIndex: 'doctor' },
  ];
  return (
    <PageContainer title="产前检查">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="无产前检查" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}