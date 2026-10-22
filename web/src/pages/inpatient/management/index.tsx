/**
 * 健澜科技 jlmedaios - 住院管理（M876）
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
import { useInpatientWorkloadM876Store } from '@/store/inpatientWorkloadM876Store';
import type { InpatientWorkload } from '@/services/api/inpatientWorkloadM876';

const wardColumns: ColumnsType<{ name: string; open: number; occupied: number }> = [
  { title: '病区', dataIndex: 'name' },
  { title: '开放床位', dataIndex: 'open', align: 'right' },
  { title: '占用床位', dataIndex: 'occupied', align: 'right', render: (v: number, r) => <Tag color={v / r.open >= 0.95 ? 'red' : 'green'}>{v}</Tag> },
];

const buildColumns = (setDetail: (r: InpatientWorkload) => void): ColumnsType<InpatientWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '开放床位', dataIndex: 'openBeds', width: 110, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '占用床位', dataIndex: 'occupiedBeds', width: 110, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  {
    title: '床位使用率(%)',
    dataIndex: 'bedOccupancyRate',
    width: 140,
    align: 'right',
    render: (v: number) => <Tag color={v >= 95 ? 'red' : v >= 85 ? 'orange' : 'green'}>{v}%</Tag>,
  },
  { title: '平均住院日(天)', dataIndex: 'averageLOS', width: 140, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '手术人次', dataIndex: 'surgeries', width: 110, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
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

export default function InpatientManagementM876Page() {
  usePageTitle('住院管理');
  const { items, loading, error, demo, load } = useInpatientWorkloadM876Store();
  const [detail, setDetail] = useState<InpatientWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="住院管理"
      description="日期 / 开放床位 / 占用床位 / 床位使用率 / 平均住院日 / 手术人次 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`住院工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1500 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="住院工作详情"
        width={880}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="开放床位">{detail.openBeds}</Descriptions.Item>
              <Descriptions.Item label="占用床位">{detail.occupiedBeds}</Descriptions.Item>
              <Descriptions.Item label="床位使用率">{detail.bedOccupancyRate}%</Descriptions.Item>
              <Descriptions.Item label="平均住院日">{detail.averageLOS} 天</Descriptions.Item>
              <Descriptions.Item label="手术人次">{detail.surgeries}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="床位周转率" span={2}>{detail.turnover}</Descriptions.Item>
              <Descriptions.Item label="平均住院日（含术前）" span={2}>{detail.los}</Descriptions.Item>
              <Descriptions.Item label="危重患者数" span={2}>{detail.criticalPatients}</Descriptions.Item>
              <Descriptions.Item label="院内死亡数" span={2}>{detail.deaths}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="各病区床位使用（内科/外科/妇产/儿科/ICU）">
              <Table rowKey="name" dataSource={detail.wardBreakdown} columns={wardColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
