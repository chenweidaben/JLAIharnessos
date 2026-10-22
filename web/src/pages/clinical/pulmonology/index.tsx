/**
 * 健澜科技 jlmedaios - 呼吸内科管理（M784）
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
import { usePulmPatientM784Store } from '@/store/pulmPatientM784Store';
import type { PulmPatient } from '@/services/api/pulmPatientM784';

const spo2Color = (v: number) => (v < 90 ? 'red' : v < 94 ? 'orange' : 'green');

const recColumns: ColumnsType<{ date: string; action: string; outcome: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '处理', dataIndex: 'action' },
  { title: '转归', dataIndex: 'outcome' },
];

const buildColumns = (setDetail: (r: PulmPatient) => void): ColumnsType<PulmPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 280, ellipsis: true },
  {
    title: 'SpO2',
    dataIndex: 'spo2',
    width: 100,
    align: 'right',
    render: (v: number) => <Tag color={spo2Color(v)}>{v}%</Tag>,
  },
  { title: '氧疗方式', dataIndex: 'oxygen', width: 240, ellipsis: true },
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

export default function PulmonologyM784Page() {
  usePageTitle('呼吸内科管理');
  const { items, loading, error, demo, load } = usePulmPatientM784Store();
  const [detail, setDetail] = useState<PulmPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="呼吸内科管理"
      description="住院号 / 患者姓名 / 诊断 / 血氧饱和度 / 氧疗方式 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`呼吸患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="呼吸患者详情"
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
              <Descriptions.Item label="SpO2">
                <Tag color={spo2Color(detail.spo2)}>{detail.spo2}%</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="氧疗方式" span={2}>{detail.oxygen}</Descriptions.Item>
              <Descriptions.Item label="肺功能" span={2}>{detail.pulmonaryFunction}</Descriptions.Item>
              <Descriptions.Item label="胸部 CT" span={2}>{detail.chestCt}</Descriptions.Item>
              <Descriptions.Item label="血气分析" span={2}>{detail.bloodGas}</Descriptions.Item>
              <Descriptions.Item label="呼吸机参数" span={2}>{detail.ventilatorParams}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="治疗记录">
              <Table rowKey="date" dataSource={detail.records} columns={recColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
