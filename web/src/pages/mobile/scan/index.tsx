/** 健澜科技 jlmedaios - 移动扫码（M305 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; drugBarcode: string; patientBarcode: string; result: string; nurse: string; time: string }
export default function MobileScanPage() {
  usePageTitle('移动扫码');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/mobile/scan').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.scans ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '药品条码', dataIndex: 'drugBarcode', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '腕带', dataIndex: 'patientBarcode' },
    { title: '结果', dataIndex: 'result', render: (v: string) => <Tag color={v === '通过' ? 'green' : 'red'}>{v}</Tag> },
    { title: '护士', dataIndex: 'nurse' },
    { title: '时间', dataIndex: 'time' },
  ];
  return (
    <PageContainer title="移动扫码核对">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无扫码" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}