/** 健澜科技 jlmedaios - 数据流向（M266 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; dataType: string; source: string; target: string; masked: string; approval: string }
export default function SecurityDataFlowPage() {
  usePageTitle('数据流向');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/security/data-flow').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.flows ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '数据类型', dataIndex: 'dataType', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '源系统', dataIndex: 'source' },
    { title: '目标', dataIndex: 'target' },
    { title: '是否脱敏', dataIndex: 'masked', render: (v: string) => <Tag color="green">{v}</Tag> },
    { title: '审批', dataIndex: 'approval' },
  ];
  return (
    <PageContainer title="数据流向登记（DPIA 配套）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无流向" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
