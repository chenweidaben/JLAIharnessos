/** 健澜科技 jlmedaios - 固定资产（M223 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface AssetRow { id: string; name: string; assetNo: string; originalValue: number; netValue: number; dept: string; status: string }
export default function AssetsPage() {
  usePageTitle('固定资产');
  const [list, setList] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/assets/list').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.assets ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<AssetRow> = [
    { title: '资产名称', dataIndex: 'name' },
    { title: '资产编号', dataIndex: 'assetNo' },
    { title: '科室', dataIndex: 'dept' },
    { title: '原值(万)', dataIndex: 'originalValue' },
    { title: '净值(万)', dataIndex: 'netValue', render: (v: number) => <Tag color="blue">{v}</Tag> },
    { title: '状态', dataIndex: 'status', render: (s: string) => <Tag color={s === '在用' ? 'green' : s === '维修中' ? 'orange' : 'default'}>{s}</Tag> },
  ];
  return (
    <PageContainer title="固定资产">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card>
          <Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无资产" /> }} pagination={{ pageSize: 10 }} />
        </Card>
      </Spin>
    </PageContainer>
  );
}
