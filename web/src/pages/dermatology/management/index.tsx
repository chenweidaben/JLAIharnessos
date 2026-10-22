/**
 * 健澜科技 jlmedaios - 皮肤科管理（M825）
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
import { useDermatologyWorkloadM825Store } from '@/store/dermatologyWorkloadM825Store';
import type { DermatologyWorkload } from '@/services/api/dermatologyWorkloadM825';

const diseaseColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '疾病类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: DermatologyWorkload) => void): ColumnsType<DermatologyWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊人次', dataIndex: 'outpatient', width: 100, align: 'right' },
  { title: '湿疹', dataIndex: 'eczema', width: 90, align: 'right', render: (v: number) => <Tag color="orange">{v}</Tag> },
  { title: '银屑病', dataIndex: 'psoriasis', width: 90, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: '痤疮', dataIndex: 'acne', width: 90, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
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

export default function DermatologyManagementM825Page() {
  usePageTitle('皮肤科管理');
  const { items, loading, error, demo, load } = useDermatologyWorkloadM825Store();
  const [detail, setDetail] = useState<DermatologyWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="皮肤科管理"
      description="日期 / 门诊人次 / 湿疹 / 银屑病 / 痤疮 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`皮肤科工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="皮肤科工作详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="日期">{detail.date}</Descriptions.Item>
              <Descriptions.Item label="门诊人次">{detail.outpatient}</Descriptions.Item>
              <Descriptions.Item label="湿疹">{detail.eczema}</Descriptions.Item>
              <Descriptions.Item label="银屑病">{detail.psoriasis}</Descriptions.Item>
              <Descriptions.Item label="痤疮">{detail.acne}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="皮肤镜检查" span={2}>{detail.dermoscopy}</Descriptions.Item>
              <Descriptions.Item label="斑贴试验" span={2}>{detail.patchTest}</Descriptions.Item>
              <Descriptions.Item label="激光治疗" span={2}>{detail.laser}</Descriptions.Item>
              <Descriptions.Item label="随访" span={2}>{detail.followup}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="疾病类型分解">
              <Table rowKey="name" dataSource={detail.diseaseBreakdown} columns={diseaseColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
