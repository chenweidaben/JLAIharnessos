/**
 * 健澜科技 jlmedaios - 心血管内科管理（M783）
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
import { useCardioPatientM783Store } from '@/store/cardioPatientM783Store';
import {
  NYHA_META,
  type CardioPatient,
} from '@/services/api/cardioPatientM783';

const medColumns: ColumnsType<{ name: string; dose: string; start: string }> = [
  { title: '药品', dataIndex: 'name' },
  { title: '剂量', dataIndex: 'dose', width: 180 },
  { title: '起始', dataIndex: 'start', width: 120 },
];

const procColumns: ColumnsType<{ date: string; name: string; outcome: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '手术名称', dataIndex: 'name' },
  { title: '转归', dataIndex: 'outcome' },
];

const buildColumns = (setDetail: (r: CardioPatient) => void): ColumnsType<CardioPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 280, ellipsis: true },
  {
    title: 'NYHA',
    dataIndex: 'nyha',
    width: 110,
    render: (v: CardioPatient['nyha']) => <Tag color={NYHA_META[v].color}>{NYHA_META[v].label}</Tag>,
  },
  { title: '状态', dataIndex: 'status', width: 100 },
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

export default function CardiologyM783Page() {
  usePageTitle('心血管内科管理');
  const { items, loading, error, demo, load } = useCardioPatientM783Store();
  const [detail, setDetail] = useState<CardioPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="心血管内科管理"
      description="住院号 / 患者姓名 / 诊断 / NYHA 心功能分级 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`心内科患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1100 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="心内科患者详情"
        width={820}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
              <Descriptions.Item label="患者姓名">{detail.patient}</Descriptions.Item>
              <Descriptions.Item label="诊断" span={2}>{detail.diagnosis}</Descriptions.Item>
              <Descriptions.Item label="NYHA 分级">
                <Tag color={NYHA_META[detail.nyha].color}>{NYHA_META[detail.nyha].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="状态">{detail.status}</Descriptions.Item>
              <Descriptions.Item label="心电图" span={2}>{detail.ecg}</Descriptions.Item>
              <Descriptions.Item label="心脏彩超" span={2}>{detail.echo}</Descriptions.Item>
              <Descriptions.Item label="冠脉造影" span={2}>{detail.angiography}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="用药记录" style={{ marginBottom: 16 }}>
              <Table rowKey="name" dataSource={detail.medications} columns={medColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="介入手术记录">
              <Table rowKey="date" dataSource={detail.procedures} columns={procColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
