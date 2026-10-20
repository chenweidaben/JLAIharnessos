/** 健澜科技 jlmedaios - 远程医疗（M224 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; dept: string; expert: string; type: string; time: string; status: string }
export default function TelemedPage() {
  usePageTitle('远程医疗');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/telemed/consultations').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.consults ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '科室', dataIndex: 'dept' },
    { title: '会诊专家', dataIndex: 'expert' },
    { title: '类型', dataIndex: 'type', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '时间', dataIndex: 'time' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已会诊' ? 'green' : v === '待会诊' ? 'orange' : 'default'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="远程医疗（会诊）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无会诊" /> }} pagination={{ pageSize: 10 }} />
        </Card>
      </Spin>
    </PageContainer>
  );
}
