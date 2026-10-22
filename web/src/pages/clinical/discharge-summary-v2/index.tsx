/**
 * 健澜科技 jlmedaios - 出院小结（M649，配套 M576）
 *
 * 三甲流程：小结 Table（入/出院日期、出院诊断、出院方式 badge）+ 详情 Modal。
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
  Space,
  Spin,
  Table,
  Tag,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { useDischargeSummaryV2M649Store } from '@/store/dischargeSummaryV2M649Store';
import {
  DISCHARGE_MODE_META,
  type DischargeSummary,
} from '@/services/api/dischargeSummaryV2M649';

export default function DischargeSummaryV2M649Page() {
  usePageTitle('出院小结');

  const { items, loading, error, demo, load } = useDischargeSummaryV2M649Store();

  const [detail, setDetail] = useState<DischargeSummary | null>(null);

  useEffect(() => {
    void load();
  }, [load]);

  const columns: ColumnsType<DischargeSummary> = [
    { title: '小结号', dataIndex: 'id', width: 100 },
    { title: '病区', dataIndex: 'ward', width: 120 },
    { title: '入院日期', dataIndex: 'admissionDate', width: 120 },
    { title: '出院日期', dataIndex: 'dischargeDate', width: 120 },
    { title: '出院诊断', dataIndex: 'dischargeDiagnosis', ellipsis: true },
    {
      title: '出院方式',
      dataIndex: 'dischargeMode',
      width: 110,
      render: (v: DischargeSummary['dischargeMode']) => (
        <Tag color={DISCHARGE_MODE_META[v].color}>{DISCHARGE_MODE_META[v].label}</Tag>
      ),
    },
    {
      title: '操作',
      dataIndex: 'id',
      width: 100,
      render: (_v, row) => (
        <Button type="link" size="small" onClick={() => setDetail(row)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      title="出院小结（v2）"
      description="入院 / 出院日期、出院诊断、出院方式"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`出院小结（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="出院小结详情"
        width={720}
        footer={
          <Space>
            <Button onClick={() => setDetail(null)}>关闭</Button>
          </Space>
        }
        onCancel={() => setDetail(null)}
      >
        {detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="小结号">{detail.id}</Descriptions.Item>
            <Descriptions.Item label="患者 ID">{detail.patientId}</Descriptions.Item>
            <Descriptions.Item label="病区">{detail.ward}</Descriptions.Item>
            <Descriptions.Item label="入院日期">{detail.admissionDate}</Descriptions.Item>
            <Descriptions.Item label="出院日期">{detail.dischargeDate}</Descriptions.Item>
            <Descriptions.Item label="入院诊断">{detail.admissionDiagnosis}</Descriptions.Item>
            <Descriptions.Item label="出院诊断">{detail.dischargeDiagnosis}</Descriptions.Item>
            <Descriptions.Item label="出院方式">
              <Tag color={DISCHARGE_MODE_META[detail.dischargeMode].color}>
                {DISCHARGE_MODE_META[detail.dischargeMode].label}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="治疗经过">{detail.treatmentSummary}</Descriptions.Item>
            <Descriptions.Item label="随访 / 出院医嘱">{detail.followupAdvice}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </PageContainer>
  );
}
