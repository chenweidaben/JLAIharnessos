/**
 * 健澜科技 jlmedaios - 神经内科管理（M861）
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
import { useNeurologyWorkloadM861Store } from '@/store/neurologyWorkloadM861Store';
import type { NeurologyWorkload } from '@/services/api/neurologyWorkloadM861';

const diseaseColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '疾病类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: NeurologyWorkload) => void): ColumnsType<NeurologyWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊数', dataIndex: 'outpatient', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '住院数', dataIndex: 'inpatient', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '卒中中心数', dataIndex: 'strokeCenter', width: 130, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '脑电图数', dataIndex: 'eeg', width: 110, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '肌电图数', dataIndex: 'emg', width: 110, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function NeurologyManagementM861Page() {
  usePageTitle('神经内科管理');
  const { items, loading, error, demo, load } = useNeurologyWorkloadM861Store();
  const [detail, setDetail] = useState<NeurologyWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="神经内科管理"
      description="日期 / 门诊数 / 住院数 / 卒中中心数 / 脑电图数 / 肌电图数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`神内工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="神内工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="门诊数">{detail.outpatient}</Descriptions.Item>
              <Descriptions.Item label="住院数">{detail.inpatient}</Descriptions.Item>
              <Descriptions.Item label="卒中中心数">{detail.strokeCenter}</Descriptions.Item>
              <Descriptions.Item label="脑电图数">{detail.eeg}</Descriptions.Item>
              <Descriptions.Item label="肌电图数">{detail.emg}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="卒中中心记录（DNT/溶栓/取栓）" span={2}>{detail.strokeRecords}</Descriptions.Item>
              <Descriptions.Item label="脑电图/肌电图检查" span={2}>{detail.eegEmgRecords}</Descriptions.Item>
              <Descriptions.Item label="神经康复" span={2}>{detail.neuroRehab}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="疾病谱分解（脑梗死/TIA/癫痫/帕金森）">
              <Table rowKey="name" dataSource={detail.diseaseBreakdown} columns={diseaseColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
