/** 健澜科技 jlmedaios - 剂量范围（M270 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; drug: string; age: string; weight: string; standard: string; maxSafe: string }
export default function CdsDoseRangePage() {
  usePageTitle('剂量范围');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/cds/dose-range').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.doses ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '药品', dataIndex: 'drug', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '年龄', dataIndex: 'age' },
    { title: '体重', dataIndex: 'weight' },
    { title: '标准剂量', dataIndex: 'standard' },
    { title: '最大安全剂量', dataIndex: 'maxSafe', render: (v: string) => <Tag color="red">{v}</Tag> },
  ];
  return (
    <PageContainer title="剂量范围审查">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无数据" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
