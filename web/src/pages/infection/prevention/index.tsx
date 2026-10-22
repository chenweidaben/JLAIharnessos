/**
 * 健澜科技 jlmedaios - 院感防控管理（M908）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Modal,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useInfectionPreventionWorkloadM908Store } from '@/store/infectionPreventionWorkloadM908Store';
import type { InfectionPreventionWorkload } from '@/services/api/infectionPreventionWorkloadM908';

const caseColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '院感部位', dataIndex: 'name' },
  { title: '病例数', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: InfectionPreventionWorkload) => void): ColumnsType<InfectionPreventionWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '院感病例数', dataIndex: 'cases', width: 120, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  {
    title: '手卫生依从率(%)',
    dataIndex: 'handHygiene',
    width: 160,
    align: 'right',
    render: (v: number) => <Tag color={v >= 95 ? 'green' : 'orange'}>{v}%</Tag>,
  },
  {
    title: '消毒合格率(%)',
    dataIndex: 'disinfection',
    width: 140,
    align: 'right',
    render: (v: number) => <Tag color={v >= 99 ? 'green' : 'red'}>{v}%</Tag>,
  },
  {
    title: '抗菌药物使用率(%)',
    dataIndex: 'antibioticUse',
    width: 180,
    align: 'right',
    render: (v: number) => <Tag color={v <= 40 ? 'green' : 'orange'}>{v}%</Tag>,
  },
  {
    title: 'MDRO 检出数',
    dataIndex: 'mdro',
    width: 140,
    align: 'right',
    render: (v: number) => <Tag color={v === 0 ? 'green' : 'red'}>{v}</Tag>,
  },
  { title: '状态', dataIndex: 'status', width: 110 },
  {
    title: '操作',
    width: 90,
    render: (_v, row) => (
      <Button type="link" size="small" onClick={() => setDetail(row)}>
        详情
      </Button>
    ),
  },
];

export default function InfectionPreventionM908Page() {
  usePageTitle('院感防控管理');
  const { items, loading, error, demo, load } = useInfectionPreventionWorkloadM908Store();
  const [detail, setDetail] = useState<InfectionPreventionWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="院感防控管理"
      description="日期 / 院感病例 / 手卫生 / 消毒合格 / 抗菌药物 / MDRO / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`院感防控工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1600 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="院感防控工作详情"
        width={920}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="院感病例数">{detail.cases}</Descriptions.Item>
              <Descriptions.Item label="手卫生依从率">{detail.handHygiene}%</Descriptions.Item>
              <Descriptions.Item label="消毒合格率">{detail.disinfection}%</Descriptions.Item>
              <Descriptions.Item label="抗菌药物使用率">{detail.antibioticUse}%</Descriptions.Item>
              <Descriptions.Item label="MDRO 检出数">{detail.mdro}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="手卫生依从性（5 时刻）" span={2}>{detail.handHygieneDetail}</Descriptions.Item>
              <Descriptions.Item label="消毒灭菌效果" span={2}>{detail.disinfectionDetail}</Descriptions.Item>
              <Descriptions.Item label="抗菌药物管理（DDDs/分级）" span={2}>{detail.antibiotic}</Descriptions.Item>
              <Descriptions.Item label="MDRO 防控（接触隔离/环境消毒）" span={2}>{detail.mdroPrevention}</Descriptions.Item>
              <Descriptions.Item label="院感暴发预警" span={2}>{detail.outbreakWarning}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="院感病例监测（呼吸道/泌尿道/手术部位/血液）">
              <Table rowKey="name" dataSource={detail.caseBreakdown} columns={caseColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
