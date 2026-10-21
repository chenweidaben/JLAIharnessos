/**
 * 健澜科技 jlmedaios - 康复评估（M622，P12 患者侧深度）
 *
 * 三甲流程：评估记录 Table（类型/得分/评估人/时间）→ 按类型分组的得分趋势 Progress
 * → 新建评估 Modal（类型 + 得分 + 评估时间 + 备注）。权限码 rehab:manage。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs, { type Dayjs } from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useRehabAssessmentM622Store } from '@/store/rehabAssessmentM622Store';
import {
  ASSESSMENT_TYPE_META,
  type AssessmentType,
  type RehabAssessment,
} from '@/services/api/rehabAssessmentM622';

interface CreateFormValues {
  assessmentType: AssessmentType;
  score: number;
  assessedBy: string;
  assessedAt: Dayjs;
  notes: string;
}

const RANGE_MAX: Record<AssessmentType, number> = {
  vas: 10,
  barthel: 100,
  berg: 56,
  'fugl-meyer': 100,
  '6-minute-walk': 1000,
};

export default function RehabAssessmentM622Page() {
  usePageTitle('康复评估');
  const { hasPermission } = usePermission();
  const canManage = hasPermission('rehab:manage');

  const { patientId, items, loading, acting, error, demo, load, create } =
    useRehabAssessmentM622Store();

  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm<CreateFormValues>();

  useEffect(() => {
    void load(patientId);
  }, [load, patientId]);

  /** 按类型取最近一次得分做趋势进度条 */
  const latestByType = useMemo(() => {
    const map = new Map<AssessmentType, RehabAssessment>();
    for (const r of items) {
      const prev = map.get(r.assessmentType);
      if (!prev || r.assessedAt > prev.assessedAt) map.set(r.assessmentType, r);
    }
    return map;
  }, [items]);

  const columns: ColumnsType<RehabAssessment> = [
    { title: '评估编号', dataIndex: 'id', width: 100 },
    {
      title: '评估类型',
      dataIndex: 'assessmentType',
      width: 160,
      render: (v: AssessmentType) => (
        <Tag color="geekblue">{ASSESSMENT_TYPE_META[v].label}</Tag>
      ),
    },
    { title: '得分', dataIndex: 'score', width: 100, sorter: (a, b) => a.score - b.score, render: (v: number, r) => `${v}（${ASSESSMENT_TYPE_META[r.assessmentType].range}）` },
    { title: '评估人', dataIndex: 'assessedBy', width: 130 },
    { title: '评估时间', dataIndex: 'assessedAt', width: 160, render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm') },
    { title: '备注', dataIndex: 'notes', ellipsis: true },
  ];

  const doCreate = async (values: CreateFormValues) => {
    const ok = await create({
      patientId,
      assessmentType: values.assessmentType,
      score: values.score,
      assessedBy: values.assessedBy,
      assessedAt: values.assessedAt.format('YYYY-MM-DDTHH:mm:ssZ'),
      notes: values.notes,
    });
    if (ok) {
      message.success('评估已新建');
      setModalOpen(false);
      form.resetFields();
    }
  };

  return (
    <PageContainer
      title="康复评估"
      description="Barthel/Berg/Fugl-Meyer/VAS/6MW 评估记录与趋势"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canManage && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 rehab:manage 权限" />
      )}

      <Card size="small" title="得分趋势（最近一次 / 满分）" style={{ marginBottom: 16 }}>
        <Row gutter={[16, 16]}>
          {(Object.keys(ASSESSMENT_TYPE_META) as AssessmentType[]).map((t) => {
            const r = latestByType.get(t);
            const max = RANGE_MAX[t];
            const percent = r ? Math.round((r.score / max) * 100) : 0;
            return (
              <Col xs={24} sm={12} lg={8} key={t}>
                <div style={{ marginBottom: 4 }}>
                  <b>{ASSESSMENT_TYPE_META[t].label}</b>
                  <span style={{ marginLeft: 8, color: '#888', fontSize: 12 }}>
                    {r ? `${r.score} / ${max}` : '暂无评估'}
                  </span>
                </div>
                <Progress percent={percent} size="small" />
              </Col>
            );
          })}
        </Row>
      </Card>

      <Card
        size="small"
        title={`评估记录（${items.length}）· 患者 ${patientId}`}
        extra={
          <Button type="primary" onClick={() => setModalOpen(true)}>
            新建评估
          </Button>
        }
      >
        <Spin spinning={loading}>
          <Table rowKey="id" dataSource={items} columns={columns} size="small" pagination={{ pageSize: 10 }} />
        </Spin>
      </Card>

      <Modal open={modalOpen} title="新建康复评估" onCancel={() => setModalOpen(false)} footer={null}>
        <Form form={form} layout="vertical" onFinish={doCreate}>
          <Form.Item name="assessmentType" label="评估类型" rules={[{ required: true, message: '必填' }]}>
            <Select
              options={(Object.keys(ASSESSMENT_TYPE_META) as AssessmentType[]).map((k) => ({
                value: k,
                label: `${ASSESSMENT_TYPE_META[k].label}（${ASSESSMENT_TYPE_META[k].range}）`,
              }))}
            />
          </Form.Item>
          <Form.Item name="score" label="得分" rules={[{ required: true, message: '必填' }]}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Space style={{ display: 'flex' }}>
            <Form.Item name="assessedBy" label="评估人" rules={[{ required: true, message: '必填' }]}>
              <Input style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="assessedAt" label="评估时间" rules={[{ required: true, message: '必填' }]}>
              <DatePicker showTime style={{ width: 200 }} />
            </Form.Item>
          </Space>
          <Form.Item name="notes" label="备注">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={acting}>
              提交评估
            </Button>
            <Button onClick={() => setModalOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}
