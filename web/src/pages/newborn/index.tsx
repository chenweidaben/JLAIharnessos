/** 健澜科技 jlmedaios - 新生儿管理（M237 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; bed: string; mother: string; gender: string; weight: number; length: number; apgar1: number; apgar5: number; status: string }
export default function NewbornPage() {
  usePageTitle('新生儿管理');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/newborn/list').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.newborns ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '床号', dataIndex: 'bed', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '母亲', dataIndex: 'mother' },
    { title: '性别', dataIndex: 'gender' },
    { title: '体重(g)', dataIndex: 'weight' },
    { title: '身长(cm)', dataIndex: 'length' },
    { title: 'Apgar 1分钟', dataIndex: 'apgar1' },
    { title: 'Apgar 5分钟', dataIndex: 'apgar5' },
    { title: '状态', dataIndex: 'status', render: (v: string) => <Tag color={v === '正常观察' ? 'green' : v === '蓝光治疗' ? 'orange' : 'red'}>{v}</Tag> },
  ];
  return (
    <PageContainer title="新生儿管理">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无新生儿" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
