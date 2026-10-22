/**
 * 健澜科技 jlmedaios - 肾内科管理（M788）
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
import { useNephroPatientM788Store } from '@/store/nephroPatientM788Store';
import type { NephroPatient } from '@/services/api/nephroPatientM788';

const egfrColor = (v: number) => (v < 15 ? 'red' : v < 30 ? 'volcano' : v < 60 ? 'orange' : 'green');

const dialColumns: ColumnsType<{ date: string; mode: string; outcome: string }> = [
  { title: '日期', dataIndex: 'date', width: 120 },
  { title: '透析方式', dataIndex: 'mode' },
  { title: '转归', dataIndex: 'outcome' },
];

const medColumns: ColumnsType<{ name: string; dose: string; start: string }> = [
  { title: '药品', dataIndex: 'name' },
  { title: '剂量', dataIndex: 'dose', width: 180 },
  { title: '起始', dataIndex: 'start', width: 120 },
];

const buildColumns = (setDetail: (r: NephroPatient) => void): ColumnsType<NephroPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 240, ellipsis: true },
  {
    title: 'eGFR',
    dataIndex: 'egfr',
    width: 110,
    align: 'right',
    render: (v: number) => <Tag color={egfrColor(v)}>{v}</Tag>,
  },
  { title: '血肌酐', dataIndex: 'creatinine', width: 110, align: 'right', render: (v: number) => `${v} μmol/L` },
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

export default function NephrologyM788Page() {
  usePageTitle('肾内科管理');
  const { items, loading, error, demo, load } = useNephroPatientM788Store();
  const [detail, setDetail] = useState<NephroPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="肾内科管理"
      description="住院号 / 患者姓名 / 诊断 / eGFR / 血肌酐 / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`肾内患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="肾内患者详情"
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
              <Descriptions.Item label="eGFR">
                <Tag color={egfrColor(detail.egfr)}>{detail.egfr} mL/min/1.73m²</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="血肌酐">{detail.creatinine} μmol/L</Descriptions.Item>
              <Descriptions.Item label="肾功能" span={2}>{detail.kidneyFunction}</Descriptions.Item>
              <Descriptions.Item label="尿蛋白定量" span={2}>{detail.urineProtein}</Descriptions.Item>
              <Descriptions.Item label="肾脏超声" span={2}>{detail.kidneyUltrasound}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="透析记录" style={{ marginBottom: 16 }}>
              <Table rowKey="date" dataSource={detail.dialysisRecords} columns={dialColumns} size="small" pagination={false} />
            </Card>
            <Card size="small" title="用药记录">
              <Table rowKey="name" dataSource={detail.medications} columns={medColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
