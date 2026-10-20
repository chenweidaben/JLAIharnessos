/** 健澜科技 jlmedaios - 社区卫生中心（M278 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; address: string; population: number; familyDoctors: number; serviceTime: string }
export default function CommunityCentersPage() {
  usePageTitle('社区卫生中心');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/community/centers').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.centers ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '名称', dataIndex: 'name', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '地址', dataIndex: 'address' },
    { title: '服务人口', dataIndex: 'population', render: (v: number) => `${v.toLocaleString()}` },
    { title: '家庭医生数', dataIndex: 'familyDoctors' },
    { title: '服务时间', dataIndex: 'serviceTime' },
  ];
  return (
    <PageContainer title="社区卫生中心">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无中心" /> }} pagination={false} /></Card>
      </Spin>
    </PageContainer>
  );
}
