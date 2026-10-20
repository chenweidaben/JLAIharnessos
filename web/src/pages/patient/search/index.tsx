/** 健澜科技 jlmedaios - 患者搜索（M301 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Input, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; name: string; gender: string; age: number; dept: string }
export default function PatientSearchPage() {
  usePageTitle('患者搜索');
  const [list, setList] = useState<Row[]>([]);
  const [kw, setKw] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/patient/search').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.patients ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const filtered = kw ? list.filter((p) => p.name.includes(kw) || p.dept.includes(kw)) : list;
  const columns: ColumnsType<Row> = [
    { title: '姓名', dataIndex: 'name' },
    { title: '性别', dataIndex: 'gender' },
    { title: '年龄', dataIndex: 'age' },
    { title: '科室', dataIndex: 'dept', render: (v: string) => <Tag color="purple">{v}</Tag> },
  ];
  return (
    <PageContainer title="患者搜索">
      <Input.Search placeholder="按姓名/科室搜索" onChange={(e) => setKw(e.target.value)} style={{ marginBottom: 16, maxWidth: 400 }} allowClear />
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={filtered} locale={{ emptyText: <Empty description="无匹配患者" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}