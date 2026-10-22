/**
 * 健澜科技 jlmedaios - 内分泌科管理（M787）
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
import { useEndoPatientM787Store } from '@/store/endoPatientM787Store';
import type { EndoPatient } from '@/services/api/endoPatientM787';

const fpgColor = (v: number) => (v >= 7.0 ? 'red' : v >= 6.1 ? 'orange' : 'green');
const hba1cColor = (v: number) => (v >= 9 ? 'red' : v >= 7 ? 'orange' : 'green');

const medColumns: ColumnsType<{ name: string; dose: string; start: string }> = [
  { title: '药品', dataIndex: 'name' },
  { title: '剂量', dataIndex: 'dose', width: 180 },
  { title: '起始', dataIndex: 'start', width: 120 },
];

const buildColumns = (setDetail: (r: EndoPatient) => void): ColumnsType<EndoPatient> => [
  { title: '住院号', dataIndex: 'inpatientNo', width: 130 },
  { title: '患者姓名', dataIndex: 'patient', width: 110 },
  { title: '诊断', dataIndex: 'diagnosis', width: 240, ellipsis: true },
  {
    title: '空腹血糖',
    dataIndex: 'fastingGlucose',
    width: 110,
    align: 'right',
    render: (v: number) => <Tag color={fpgColor(v)}>{v} mmol/L</Tag>,
  },
  {
    title: 'HbA1c',
    dataIndex: 'hba1c',
    width: 100,
    align: 'right',
    render: (v: number) => <Tag color={hba1cColor(v)}>{v}%</Tag>,
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

export default function EndocrinologyM787Page() {
  usePageTitle('内分泌科管理');
  const { items, loading, error, demo, load } = useEndoPatientM787Store();
  const [detail, setDetail] = useState<EndoPatient | null>(null);
  const columns = buildColumns(setDetail);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <PageContainer
      title="内分泌科管理"
      description="住院号 / 患者姓名 / 诊断 / 空腹血糖 / HbA1c / 状态"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}

      <Card size="small" title={`内分泌患者（${items.length}）`}>
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={false} scroll={{ x: 1200 }} />
        </Spin>
      </Card>

      <Modal
        open={!!detail}
        title="内分泌患者详情"
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
              <Descriptions.Item label="空腹血糖">
                <Tag color={fpgColor(detail.fastingGlucose)}>{detail.fastingGlucose} mmol/L</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="HbA1c">
                <Tag color={hba1cColor(detail.hba1c)}>{detail.hba1c}%</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="血糖监测曲线" span={2}>{detail.glucoseCurve}</Descriptions.Item>
              <Descriptions.Item label="甲状腺功能" span={2}>{detail.thyroid}</Descriptions.Item>
              <Descriptions.Item label="并发症筛查" span={2}>{detail.complications}</Descriptions.Item>
              <Descriptions.Item label="饮食指导" span={2}>{detail.dietAdvice}</Descriptions.Item>
            </Descriptions>
            <Card size="small" title="用药记录">
              <Table rowKey="name" dataSource={detail.medications} columns={medColumns} size="small" pagination={false} />
            </Card>
          </>
        )}
      </Modal>
    </PageContainer>
  );
}
