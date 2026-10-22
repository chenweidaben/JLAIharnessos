/**
 * 健澜科技 jlmedaios - 急诊科管理（M883 原地升级 M845 视图）
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
import { useEmergencyWorkloadM883Store } from '@/store/emergencyWorkloadM883Store';
import type { EmergencyWorkloadM883 } from '@/services/api/emergencyWorkloadM883';

const triageColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '急诊分级', dataIndex: 'name' },
  { title: '人次', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: EmergencyWorkloadM883) => void): ColumnsType<EmergencyWorkloadM883> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '急诊人次', dataIndex: 'visits', width: 110, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '抢救人次', dataIndex: 'rescue', width: 110, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '留观人次', dataIndex: 'observation', width: 110, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '急诊手术数', dataIndex: 'emergencySurgery', width: 130, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function EmergencyManagementM883Page() {
  usePageTitle('急诊科管理');
  const { items, loading, error, demo, load } = useEmergencyWorkloadM883Store();
  const [detail, setDetail] = useState<EmergencyWorkloadM883 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="急诊科管理"
      description="日期 / 急诊人次 / 抢救人次 / 留观人次 / 急诊手术数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`急诊科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="急诊科工作详情"
        width={880}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="急诊人次">{detail.visits}</Descriptions.Item>
              <Descriptions.Item label="抢救人次">{detail.rescue}</Descriptions.Item>
              <Descriptions.Item label="留观人次">{detail.observation}</Descriptions.Item>
              <Descriptions.Item label="急诊手术数">{detail.emergencySurgery}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="抢救成功率" span={2}>{detail.rescueSuccess}</Descriptions.Item>
              <Descriptions.Item label="绿色通道（卒中/胸痛/创伤）" span={2}>{detail.greenChannel}</Descriptions.Item>
              <Descriptions.Item label="留观床位使用" span={2}>{detail.observationBeds}</Descriptions.Item>
              <Descriptions.Item label="急诊死亡率" span={2}>{detail.mortality}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="急诊分级（Ⅰ级红/Ⅱ级橙/Ⅲ级黄/Ⅳ级绿）">
              <Table rowKey="name" dataSource={detail.triageBreakdown} columns={triageColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
