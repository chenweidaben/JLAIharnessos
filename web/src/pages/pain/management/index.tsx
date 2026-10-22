/**
 * 健澜科技 jlmedaios - 疼痛科管理（M847 原地升级 M817 视图）
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
import { usePainWorkloadM847Store } from '@/store/painWorkloadM847Store';
import type { PainWorkloadM847 } from '@/services/api/painWorkloadM847';

const typeColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '疼痛类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: PainWorkloadM847) => void): ColumnsType<PainWorkloadM847> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '疼痛门诊数', dataIndex: 'outpatient', width: 130, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '神经阻滞数', dataIndex: 'nerveBlock', width: 120, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '小针刀数', dataIndex: 'needleKnife', width: 110, align: 'right', render: (v: number) => <Tag color="green">{v}</Tag> },
  { title: '射频治疗数', dataIndex: 'rf', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function PainManagementM847Page() {
  usePageTitle('疼痛科管理');
  const { items, loading, error, demo, load } = usePainWorkloadM847Store();
  const [detail, setDetail] = useState<PainWorkloadM847 | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="疼痛科管理"
      description="日期 / 疼痛门诊数 / 神经阻滞数 / 小针刀数 / 射频治疗数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`疼痛工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="疼痛工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="疼痛门诊数">{detail.outpatient}</Descriptions.Item>
              <Descriptions.Item label="神经阻滞数">{detail.nerveBlock}</Descriptions.Item>
              <Descriptions.Item label="小针刀数">{detail.needleKnife}</Descriptions.Item>
              <Descriptions.Item label="射频治疗数">{detail.rf}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="VAS 评分记录" span={2}>{detail.vasRecords}</Descriptions.Item>
              <Descriptions.Item label="治疗记录（药物/神经阻滞/射频）" span={2}>{detail.treatmentRecords}</Descriptions.Item>
              <Descriptions.Item label="疗效评估" span={2}>{detail.efficacy}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="疼痛类型分解（癌痛/腰腿痛/神经痛）">
              <Table rowKey="name" dataSource={detail.typeBreakdown} columns={typeColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
