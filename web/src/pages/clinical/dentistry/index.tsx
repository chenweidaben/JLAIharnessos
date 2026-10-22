/**
 * 健澜科技 jlmedaios - 口腔科管理（M780）
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
import { useDentalPatientM780Store } from '@/store/dentalPatientM780Store';
import type { DentalPatient } from '@/services/api/dentalPatientM780';

const recColumns: ColumnsType<{ date: string; action: string; outcome: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '处理', dataIndex: 'action' },
  { title: '转归', dataIndex: 'outcome' },
];

const buildColumns = (setDetail: (r: DentalPatient) => void): ColumnsType<DentalPatient> => [
  { title: '病历号', dataIndex: 'caseNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 240, ellipsis: true },
  { title: '牙位', dataIndex: 'tooth', width: 90 },
  { title: '治疗方案', dataIndex: 'treatment', width: 220, ellipsis: true },
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

export default function DentistryM780Page() {
  usePageTitle('口腔科管理');
  const { items, loading, error, demo, load } = useDentalPatientM780Store();
  const [detail, setDetail] = useState<DentalPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="口腔科管理"
      description="病历号 / 患者姓名 / 诊断 / 牙位 / 治疗方案 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`口腔患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="口腔患者详情"
        width={780}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <>
            <Descriptions column={2} bordered size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="病历号">{detail.caseNo}</Descriptions.Item>
              <Descriptions.Item label="患者姓名">{detail.patient}</Descriptions.Item>
              <Descriptions.Item label="诊断" span={2}>{detail.diagnosis}</Descriptions.Item>
              <Descriptions.Item label="牙位">{detail.tooth}</Descriptions.Item>
              <Descriptions.Item label="治疗方案" span={2}>{detail.treatment}</Descriptions.Item>
              <Descriptions.Item label="口腔检查" span={2}>{detail.oralExam}</Descriptions.Item>
              <Descriptions.Item label="牙片" span={2}>{detail.xray}</Descriptions.Item>
              <Descriptions.Item label="修复 / 正畸方案" span={2}>{detail.prostheticPlan}</Descriptions.Item>
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
