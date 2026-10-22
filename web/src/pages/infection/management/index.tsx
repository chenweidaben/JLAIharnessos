/**
 * 健澜科技 jlmedaios - 院感管理（M892）
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
import { useInfectionWorkloadM892Store } from '@/store/infectionWorkloadM892Store';
import type { InfectionWorkload } from '@/services/api/infectionWorkloadM892';

const simpleColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '项目', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: InfectionWorkload) => void): ColumnsType<InfectionWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '院感病例数', dataIndex: 'cases', width: 120, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '手卫生依从率(%)', dataIndex: 'handHygiene', width: 160, align: 'right', render: (v: number) => <Tag color={v >= 90 ? 'green' : 'orange'}>{v}%</Tag> },
  { title: '消毒合格率(%)', dataIndex: 'disinfectionPass', width: 150, align: 'right', render: (v: number) => <Tag color="cyan">{v}%</Tag> },
  { title: '抗菌药物使用率(%)', dataIndex: 'antibioticsUse', width: 180, align: 'right', render: (v: number) => <Tag color={v <= 50 ? 'green' : 'orange'}>{v}%</Tag> },
  { title: '耐药菌检出数', dataIndex: 'mdro', width: 140, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function InfectionManagementM892Page() {
  usePageTitle('医院感染管理');
  const { items, loading, error, demo, load } = useInfectionWorkloadM892Store();
  const [detail, setDetail] = useState<InfectionWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="医院感染管理"
      description="日期 / 院感病例 / 手卫生依从率 / 消毒合格率 / 抗菌药物使用率 / 耐药菌检出 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`院感工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1600 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="院感工作详情"
        width={900}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="院感病例数">{detail.cases}</Descriptions.Item>
              <Descriptions.Item label="手卫生依从率">{detail.handHygiene}%</Descriptions.Item>
              <Descriptions.Item label="消毒合格率">{detail.disinfectionPass}%</Descriptions.Item>
              <Descriptions.Item label="抗菌药物使用率">{detail.antibioticsUse}%</Descriptions.Item>
              <Descriptions.Item label="耐药菌检出数">{detail.mdro}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="手卫生依从率（含正确率）" span={2}>{detail.handHygieneDetail}</Descriptions.Item>
              <Descriptions.Item label="消毒灭菌效果监测" span={2}>{detail.disinfection}</Descriptions.Item>
              <Descriptions.Item label="抗菌药物使用强度（DDDs）" span={2}>{detail.auc}</Descriptions.Item>
              <Descriptions.Item label="暴发疫情处置" span={2}>{detail.outbreak}</Descriptions.Item>
            </Descriptions>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Card size="small" title="院感部位（呼吸道/泌尿道/手术部位/血液）">
                <Table rowKey="name" dataSource={detail.siteBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
              <Card size="small" title="多重耐药菌（MRSA/VRE/CRE）">
                <Table rowKey="name" dataSource={detail.mdroBreakdown} columns={simpleColumns} size="small" pagination={false} />
              </Card>
            </div>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
