/** 健澜科技 jlmedaios - 检验危急值告警（M276 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; testItem: string; result: string; refRange: string; status: string }
export default function CdsLabAlertPage() {
  usePageTitle('检验危急值');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/cds/lab-alert').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.alerts ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '项目', dataIndex: 'testItem', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color="red">{v}</Tag> },
    { title: '参考范围', dataIndex: 'refRange' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v.includes('已') ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="检验危急值告警">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无告警" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
