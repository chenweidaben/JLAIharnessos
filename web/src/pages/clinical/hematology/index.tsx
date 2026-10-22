/**
 * 健澜科技 jlmedaios - 血液科管理（M789）
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
import { useHemaPatientM789Store } from '@/store/hemaPatientM789Store';
import type { HemaPatient } from '@/services/api/hemaPatientM789';

const wbcColor = (v: number) => (v < 4 || v > 10 ? 'orange' : 'green');
const hgbColor = (v: number) => (v < 90 ? 'red' : v < 110 ? 'orange' : 'green');
const pltColor = (v: number) => (v < 50 ? 'red' : v < 100 ? 'orange' : 'green');

const transColumns: ColumnsType<{ date: string; product: string; volume: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '制品', dataIndex: 'product' },
  { title: '剂量', dataIndex: 'volume', width: 120 },
];

const buildColumns = (setDetail: (r: HemaPatient) => void): ColumnsType<HemaPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 260, ellipsis: true },
  {
    title: 'WBC',
    dataIndex: 'wbc',
    width: 100,
    align: 'right',
    render: (v: number) => <Tag color={wbcColor(v)}>{v}</Tag>,
  },
  {
    title: 'HGB',
    dataIndex: 'hgb',
    width: 100,
    align: 'right',
    render: (v: number) => <Tag color={hgbColor(v)}>{v}</Tag>,
  },
  {
    title: 'PLT',
    dataIndex: 'plt',
    width: 100,
    align: 'right',
    render: (v: number) => <Tag color={pltColor(v)}>{v}</Tag>,
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

export default function HematologyM789Page() {
  usePageTitle('血液科管理');
  const { items, loading, error, demo, load } = useHemaPatientM789Store();
  const [detail, setDetail] = useState<HemaPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="血液科管理"
      description="住院号 / 患者姓名 / 诊断 / WBC / HGB / PLT / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`血液患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1300 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="血液患者详情"
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
              <Descriptions.Item label="WBC">{detail.wbc} ×10⁹/L</Descriptions.Item>
              <Descriptions.Item label="HGB">{detail.hgb} g/L</Descriptions.Item>
              <Descriptions.Item label="PLT">{detail.plt} ×10⁹/L</Descriptions.Item>
              <Descriptions.Item label="骨髓穿刺" span={2}>{detail.boneMarrow}</Descriptions.Item>
              <Descriptions.Item label="流式细胞术" span={2}>{detail.flowCytometry}</Descriptions.Item>
              <Descriptions.Item label="化疗方案" span={2}>{detail.chemoRegimen}</Descriptions.Item>
              <Descriptions.Item label="感染预防" span={2}>{detail.infectionPrevention}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="输血记录">
              <Table rowKey="date" dataSource={detail.transfusionRecords} columns={transColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
