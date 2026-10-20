/** 健澜科技 jlmedaios - 后勤管理（M224 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; dept: string; type: string; quantity: number; washDate: string; status: string }
export default function LogisticsLaundryPage() {
  usePageTitle('后勤管理');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/logistics/laundry').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.laundry ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '科室', dataIndex: 'dept' },
    { title: '被服类型', dataIndex: 'type', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '数量', dataIndex: 'quantity' },
    { title: '洗涤日期', dataIndex: 'washDate' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '已送回' ? 'green' : v === '已消毒' ? 'cyan' : 'default'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="后勤管理（被服洗涤）">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无记录" /> }} pagination={{ pageSize: 10 }} />
        </Card>
      </Spin>
    </PageContainer>
  );
}
