/**
 * 健澜科技 jlmedaios - 口腔科管理（M854）
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
import { useDentistryWorkloadM854Store } from '@/store/dentistryWorkloadM854Store';
import type { DentistryWorkload } from '@/services/api/dentistryWorkloadM854';

const treatColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '治疗类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: DentistryWorkload) => void): ColumnsType<DentistryWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊数', dataIndex: 'outpatient', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '补牙数', dataIndex: 'filling', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '拔牙数', dataIndex: 'extraction', width: 100, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '种植牙数', dataIndex: 'implant', width: 110, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '正畸数', dataIndex: 'orthodontics', width: 100, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function DentistryManagementM854Page() {
  usePageTitle('口腔科管理');
  const { items, loading, error, demo, load } = useDentistryWorkloadM854Store();
  const [detail, setDetail] = useState<DentistryWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="口腔科管理"
      description="日期 / 门诊数 / 补牙数 / 拔牙数 / 种植牙数 / 正畸数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`口腔科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="口腔科工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="门诊数">{detail.outpatient}</Descriptions.Item>
              <Descriptions.Item label="补牙数">{detail.filling}</Descriptions.Item>
              <Descriptions.Item label="拔牙数">{detail.extraction}</Descriptions.Item>
              <Descriptions.Item label="种植牙数">{detail.implant}</Descriptions.Item>
              <Descriptions.Item label="正畸数">{detail.orthodontics}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="种植牙记录" span={2}>{detail.implantRecords}</Descriptions.Item>
              <Descriptions.Item label="正畸记录" span={2}>{detail.orthoRecords}</Descriptions.Item>
              <Descriptions.Item label="口腔颌面外科手术" span={2}>{detail.oralSurgery}</Descriptions.Item>
              <Descriptions.Item label="儿童牙病" span={2}>{detail.pedoDentistry}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="治疗类型分解">
              <Table rowKey="name" dataSource={detail.treatmentBreakdown} columns={treatColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
