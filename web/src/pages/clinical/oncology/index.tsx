/**
 * 健澜科技 jlmedaios - 肿瘤科管理（M792）
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
import { useOncPatientM792Store } from '@/store/oncPatientM792Store';
import {
  PHASE_META,
  type OncPatient,
} from '@/services/api/oncPatientM792';

const aeColumns: ColumnsType<{ date: string; grade: string; event: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '分级', dataIndex: 'grade', width: 90, render: (v: string) => <Tag color={v.startsWith('3') || v.startsWith('4') ? 'red' : 'orange'}>{v}</Tag> },
  { title: '不良事件', dataIndex: 'event' },
];

const buildColumns = (setDetail: (r: OncPatient) => void): ColumnsType<OncPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 240, ellipsis: true },
  { title: 'TNM 分期', dataIndex: 'tnm', width: 160 },
  {
    title: '治疗阶段',
    dataIndex: 'phase',
    width: 110,
    render: (v: OncPatient['phase']) => <Tag color={PHASE_META[v].color}>{PHASE_META[v].label}</Tag>,
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

export default function OncologyM792Page() {
  usePageTitle('肿瘤科管理');
  const { items, loading, error, demo, load } = useOncPatientM792Store();
  const [detail, setDetail] = useState<OncPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="肿瘤科管理"
      description="住院号 / 患者姓名 / 诊断 / TNM 分期 / 治疗阶段 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`肿瘤患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="肿瘤患者详情"
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
              <Descriptions.Item label="TNM 分期">{detail.tnm}</Descriptions.Item>
              <Descriptions.Item label="治疗阶段">
                <Tag color={PHASE_META[detail.phase].color}>{PHASE_META[detail.phase].label}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="病理报告" span={2}>{detail.pathology}</Descriptions.Item>
              <Descriptions.Item label="影像学评估" span={2}>{detail.imaging}</Descriptions.Item>
              <Descriptions.Item label="化疗 / 放疗 / 靶向 / 免疫方案" span={2}>{detail.regimen}</Descriptions.Item>
              <Descriptions.Item label="营养评估" span={2}>{detail.nutrition}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="不良反应记录">
              <Table rowKey="date" dataSource={detail.adverseEvents} columns={aeColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
