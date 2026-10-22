/**
 * 健澜科技 jlmedaios - 入院护理评估（M695）
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
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useAdmissionAssessmentM695Store } from '@/store/admissionAssessmentM695Store';
import {
  barthelLevel,
  morseLevel,
  nortonLevel,
  type AdmissionAssessment,
} from '@/services/api/admissionAssessmentM695';

const buildColumns = (setDetail: (r: AdmissionAssessment) => void): ColumnsType<AdmissionAssessment> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 120 },
  { title: '患者', dataIndex: 'patientId', width: 100 },
  { title: '评估时间', dataIndex: 'assessedAt', width: 150, render: (v: string) => dayjs(v).format('MM-DD HH:mm') },
  { title: '责任护士', dataIndex: 'nurse', width: 110 },
  {
    title: 'Barthel 评分',
    dataIndex: 'barthelScore',
    width: 160,
    render: (v: number) => {
      const lv = barthelLevel(v);
      return <Tag color={lv.color}>{v}（{lv.label}）</Tag>;
    },
  },
  {
    title: 'Norton 压疮风险',
    dataIndex: 'nortonScore',
    width: 160,
    render: (v: number) => {
      const lv = nortonLevel(v);
      return <Tag color={lv.color}>{v}（{lv.label}）</Tag>;
    },
  },
  {
    title: 'Morse 跌倒风险',
    dataIndex: 'morseScore',
    width: 160,
    render: (v: number) => {
      const lv = morseLevel(v);
      return <Tag color={lv.color}>{v}（{lv.label}）</Tag>;
    },
  },
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

export default function AdmissionAssessmentM695Page() {
  usePageTitle('入院护理评估');
  const { items, loading, error, demo, load } = useAdmissionAssessmentM695Store();
  const [detail, setDetail] = useState<AdmissionAssessment | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="入院护理评估"
      description="住院号 / 评估时间 / 责任护士 / 跌倒 / 压疮风险"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`入院评估（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="入院护理评估详情"
        width={680}
        footer={<Button onClick={() => setDetail(null)}>关闭</Button>}
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="住院号">{detail.inpatientNo}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="评估时间">{dayjs(detail.assessedAt).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
            <Descriptions.Item label="责任护士">{detail.nurse}</Descriptions.Item>
            <Descriptions.Item label="Barthel 日常生活能力评分">
              {detail.barthelScore} 分（{barthelLevel(detail.barthelScore).label}）
            </Descriptions.Item>
            <Descriptions.Item label="Norton 压疮风险评分">
              {detail.nortonScore} 分（{nortonLevel(detail.nortonScore).label}）
            </Descriptions.Item>
            <Descriptions.Item label="Morse 跌倒风险评分">
              {detail.morseScore} 分（{morseLevel(detail.morseScore).label}）
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
