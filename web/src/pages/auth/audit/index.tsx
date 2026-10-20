/** 健澜科技 jlmedaios - 登录日志（M263 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; user: string; ip: string; device: string; time: string; result: string }
export default function AuthAuditPage() {
  usePageTitle('登录日志');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/auth/audit').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.logs ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '用户', dataIndex: 'user' },
    { title: 'IP', dataIndex: 'ip' },
    { title: '设备', dataIndex: 'device' },
    { title: '时间', dataIndex: 'time' },
    { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color={v === '成功' ? 'green' : 'red'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="登录日志">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无日志" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
