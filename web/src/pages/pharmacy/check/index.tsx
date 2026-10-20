/** 健澜科技 jlmedaios - 药品盘点（M326 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; checkDate: string; drug: string; bookValue: string; actualValue: string; diff: string }
export default function PharmacyCheckPage() {
  usePageTitle('药品盘点');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/pharmacy/check').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.items ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '日期', dataIndex: 'checkDate' },
    { title: '药品', dataIndex: 'drug', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '账面', dataIndex: 'bookValue' },
    { title: '实盘', dataIndex: 'actualValue', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '差异', dataIndex: 'diff', render: (v: string) => <Tag color={v.startsWith('-') ? 'red' : v === '0' ? 'green' : 'orange'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="药品盘点">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无盘点" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}