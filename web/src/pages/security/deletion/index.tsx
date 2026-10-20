/** 健澜科技 jlmedaios - 数据删除请求（M265 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; dataType: string; reason: string; approval: string; execution: string }
export default function SecurityDeletionPage() {
  usePageTitle('数据删除请求');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/security/deletion').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.requests ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '删除范围', dataIndex: 'dataType' },
    { title: '原因', dataIndex: 'reason' },
    { title: '审批', dataIndex: 'approval', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '执行', dataIndex: 'execution' },
  ];
  return (
    <PageContainer title="数据删除请求（被遗忘权）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无请求" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
