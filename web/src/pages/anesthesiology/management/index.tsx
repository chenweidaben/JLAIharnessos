/**
 * 健澜科技 jlmedaios - 麻醉科管理（M885 原地升级 M843 视图）
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
import { useAnesthesiologyWorkloadM885Store } from '@/store/anesthesiologyWorkloadM885Store';
import type { AnesthesiologyWorkloadM885 } from '@/services/api/anesthesiologyWorkloadM885';

const asaColumns: ColumnsType<{ name: string; count: number }> = [
  { title: 'ASA 分级', dataIndex: 'name' },
  { title: '人数', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: AnesthesiologyWorkloadM885) => void): ColumnsType<AnesthesiologyWorkloadM885> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '全麻数', dataIndex: 'general', width: 100, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '椎管内麻醉数', dataIndex: 'neuraxial', width: 140, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '神经阻滞数', dataIndex: 'nerveBlock', width: 130, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
  { title: '局麻数', dataIndex: 'local', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '疼痛门诊数', dataIndex: 'painClinic', width: 120, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
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

export default function AnesthesiologyManagementM885Page() {
  usePageTitle('麻醉科管理');
  const { items, loading, error, demo, load } = useAnesthesiologyWorkloadM885Store();
  const [detail, setDetail] = useState<AnesthesiologyWorkloadM885 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="麻醉科管理"
      description="日期 / 全麻 / 椎管内 / 神经阻滞 / 局麻 / 疼痛门诊 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`麻醉科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1400 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="麻醉科工作详情"
        width={880}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="全麻数">{detail.general}</Descriptions.Item>
              <Descriptions.Item label="椎管内麻醉数">{detail.neuraxial}</Descriptions.Item>
              <Descriptions.Item label="神经阻滞数">{detail.nerveBlock}</Descriptions.Item>
              <Descriptions.Item label="局麻数">{detail.local}</Descriptions.Item>
              <Descriptions.Item label="疼痛门诊数">{detail.painClinic}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="麻醉并发症（喉痉挛/支痉挛/药物过敏）" span={2}>{detail.complications}</Descriptions.Item>
              <Descriptions.Item label="术后镇痛（PCIA/PCEA）" span={2}>{detail.pca}</Descriptions.Item>
              <Descriptions.Item label="疼痛门诊（慢性疼痛/癌痛）" span={2}>{detail.painClinicDetail}</Descriptions.Item>
              <Descriptions.Item label="麻醉后监测记录" span={2}>{detail.postOpMonitoring}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="麻醉分级（ASA Ⅰ-Ⅳ级）">
              <Table rowKey="name" dataSource={detail.asaBreakdown} columns={asaColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
