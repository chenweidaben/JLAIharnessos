/**
 * 健澜科技 jlmedaios - 眼科管理（M852 原地升级 M822 视图）
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
import { useOphthalmologyWorkloadM852Store } from '@/store/ophthalmologyWorkloadM852Store';
import type { OphthalmologyWorkloadM852 } from '@/services/api/ophthalmologyWorkloadM852';

const diseaseColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '疾病类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: OphthalmologyWorkloadM852) => void): ColumnsType<OphthalmologyWorkloadM852> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊数', dataIndex: 'outpatient', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '白内障手术数', dataIndex: 'cataract', width: 140, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '青光眼手术数', dataIndex: 'glaucoma', width: 140, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '屈光手术数', dataIndex: 'refractive', width: 130, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function OphthalmologyManagementM852Page() {
  usePageTitle('眼科管理');
  const { items, loading, error, demo, load } = useOphthalmologyWorkloadM852Store();
  const [detail, setDetail] = useState<OphthalmologyWorkloadM852 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="眼科管理"
      description="日期 / 门诊数 / 白内障手术数 / 青光眼手术数 / 屈光手术数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`眼科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="眼科工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="门诊数">{detail.outpatient}</Descriptions.Item>
              <Descriptions.Item label="白内障手术数">{detail.cataract}</Descriptions.Item>
              <Descriptions.Item label="青光眼手术数">{detail.glaucoma}</Descriptions.Item>
              <Descriptions.Item label="屈光手术数">{detail.refractive}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="手术记录" span={2}>{detail.surgeries}</Descriptions.Item>
              <Descriptions.Item label="视力检查记录" span={2}>{detail.vision}</Descriptions.Item>
              <Descriptions.Item label="眼底照相记录" span={2}>{detail.fundus}</Descriptions.Item>
              <Descriptions.Item label="验光配镜记录" span={2}>{detail.optometry}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="疾病谱分解">
              <Table rowKey="name" dataSource={detail.diseaseBreakdown} columns={diseaseColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
