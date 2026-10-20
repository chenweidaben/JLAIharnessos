/** 健澜科技 jlmedaios - 中医辨证（M283 DEMO） Copyright (c) 2026 杭州健澜科技有限公司 */
import { useEffect, useState } from 'react';
import { Alert, Card, Empty, Spin, Table, Tag } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { PageContainer } from '@/components/common';
import { usePageTitle } from '@/hooks';
interface Row { id: string; patient: string; syndrome: string; tongue: string; pulse: string; therapy: string; formula: string }
const DEMO: Row[] = [
  { id: 'TCM-001', patient: '张演示', syndrome: '气虚血瘀', tongue: '舌淡暗苔白', pulse: '细涩', therapy: '益气活血', formula: '补阳还五汤加减' },
  { id: 'TCM-002', patient: '李演示', syndrome: '痰湿内阻', tongue: '舌胖大苔白腻', pulse: '滑', therapy: '燥湿化痰', formula: '二陈汤加减' },
];
export default function TcmDiagnosisPage() {
  usePageTitle('中医辨证');
  const [list, setList] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  useEffect(() => {
    let alive = true; setLoading(true);
    setTimeout(() => { if (alive) setList(DEMO); setLoading(false); }, 200);
    return () => { alive = false; };
  }, []);
  const columns: ColumnsType<Row> = [
    { title: '患者', dataIndex: 'patient' },
    { title: '证型', dataIndex: 'syndrome', render: (v: string) => <Tag color="purple">{v}</Tag> },
    { title: '舌象', dataIndex: 'tongue' },
    { title: '脉象', dataIndex: 'pulse' },
    { title: '治法', dataIndex: 'therapy', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '方药', dataIndex: 'formula' },
  ];
  return (
    <PageContainer title="中医辨证">
      <Spin spinning={loading}>
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 16 }} />}
        <Card><Table rowKey="id" columns={columns} dataSource={list} locale={{ emptyText: <Empty description="暂无辨证" /> }} pagination={{ pageSize: 10 }} /></Card>
      </Spin>
    </PageContainer>
  );
}
