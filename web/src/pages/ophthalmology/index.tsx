/** 健澜科技 jlmedaios - 眼科检查（M240 对接真实 API） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; uncorrectedVA: { left: string; right: string }; correctedVA: { left: string; right: string }; intraocularPressure: { left: number; right: number }; slitLamp: string; fundus: string }
export default function OphthalmologyPage() {
  usePageTitle('眼科检查');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    fetch('/api/v1/ophthalmology/exams').then((r) => r.json())
      .then((j) => { if (alive) setList(j.data?.exams ?? []); })
      .catch((e: Error) => { if (alive) setError(e.message); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '裸眼视力', dataIndex: 'uncorrectedVA', render: (v: Row['uncorrectedVA']) => <Tag color="blue">L{v.left}/R{v.right}</Tag> },
    { title: '矫正视力', dataIndex: 'correctedVA', render: (v: Row['correctedVA']) => <Tag color="green">L{v.left}/R{v.right}</Tag> },
    { title: '眼压(mmHg)', dataIndex: 'intraocularPressure', render: (v: Row['intraocularPressure']) => `L${v.left}/R${v.right}` },
    { title: '裂隙灯', dataIndex: 'slitLamp' },
    { title: '眼底', dataIndex: 'fundus' },
  ];
  return (
    <PageContainer title="眼科检查">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无检查" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
