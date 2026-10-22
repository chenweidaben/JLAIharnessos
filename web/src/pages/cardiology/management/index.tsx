/**
 * 健澜科技 jlmedaios - 心血管内科管理（M858）
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
import { useCardiologyWorkloadM858Store } from '@/store/cardiologyWorkloadM858Store';
import type { CardiologyWorkload } from '@/services/api/cardiologyWorkloadM858';

const diseaseColumns: ColumnsType<{ name: string; count: number }> = [
  { title: '疾病类型', dataIndex: 'name' },
  { title: '数量', dataIndex: 'count', align: 'right' },
];

const buildColumns = (setDetail: (r: CardiologyWorkload) => void): ColumnsType<CardiologyWorkload> => [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '门诊数', dataIndex: 'outpatient', width: 100, align: 'right', render: (v: number) => <Tag color="blue">{v}</Tag> },
  { title: '住院数', dataIndex: 'inpatient', width: 100, align: 'right', render: (v: number) => <Tag color="cyan">{v}</Tag> },
  { title: '介入手术数', dataIndex: 'interventional', width: 130, align: 'right', render: (v: number) => <Tag color="red">{v}</Tag> },
  { title: 'CCU 床位数', dataIndex: 'ccuBeds', width: 120, align: 'right', render: (v: number) => <Tag color="purple">{v}</Tag> },
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

export default function CardiologyManagementM858Page() {
  usePageTitle('心血管内科管理');
  const { items, loading, error, demo, load } = useCardiologyWorkloadM858Store();
  const [detail, setDetail] = useState<CardiologyWorkload | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="心血管内科管理"
      description="日期 / 门诊数 / 住院数 / 介入手术数 / CCU 床位数 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`心血管工作（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="心血管工作详情"
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
              <Descriptions.Item label="介入手术数">{detail.interventional}</Descriptions.Item>
              <Descriptions.Item label="CCU 床位数">{detail.ccuBeds}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="介入手术记录（PCI/起搏器/射频）" span={2}>{detail.interventionalRecords}</Descriptions.Item>
              <Descriptions.Item label="CCU 监护记录" span={2}>{detail.ccuMonitoring}</Descriptions.Item>
              <Descriptions.Item label="心脏康复记录" span={2}>{detail.cardiacRehab}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="疾病谱分解（高血压/冠心病/心衰/心律失常）">
              <Table rowKey="name" dataSource={detail.diseaseBreakdown} columns={diseaseColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
