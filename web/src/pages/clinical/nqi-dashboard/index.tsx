/**
 * 健澜科技 jlmedaios - 护理 NQI 敏感指标看板（M545，P0）
 *
 * 三甲流程：5 指标卡片（code Tag / 中文名 / 单位 / 分子分母释义 / 描述）点击切换
 * → 右侧事件 Table（reportedAt 倒序）→ 上报 Modal（患者标识/事件经过/根本原因/改进措施/上报人工号）。
 * 权限码 nqi:view。后端字典无计算率值，页面不虚构达标率。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import dayjs from 'dayjs';

import { PageContainer } from '@/components/common';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import { usePageTitle } from '@/hooks';
import { usePermission } from '@/router/guards';
import { useAuthStore } from '@/store/authStore';
import { useNqiDashboardM545Store } from '@/store/nqiDashboardM545Store';
import { INDICATOR_META, type NqiEvent } from '@/services/api/nqiDashboard';

interface ReportFormValues {
  patientId: string;
  eventDescription: string;
  rootCause: string;
  improvementAction: string;
  reporterId: string;
}

export default function NqiDashboardPage() {
  usePageTitle('护理 NQI 看板');
  const { hasPermission } = usePermission();
  const canView = hasPermission('nqi:view');
  const currentUser = useAuthStore((s) => s.user);

  const {
    indicators,
    events,
    selectedCode,
    loading,
    eventsLoading,
    acting,
    error,
    demo,
    load,
    selectIndicator,
    submitReport,
  } = useNqiDashboardM545Store();

  const [reportOpen, setReportOpen] = useState(false);
  const [form] = Form.useForm<ReportFormValues>();

  useEffect(() => {
    void load();
  }, [load]);

  const selectedMeta = INDICATOR_META[selectedCode];

  const doReport = async (values: ReportFormValues) => {
    try {
      await submitReport(values);
      message.success('事件已上报');
      setReportOpen(false);
      form.resetFields();
    } catch {
      // error 已写入 store
    }
  };

  const columns = [
    { title: '事件编号', dataIndex: 'id', width: 100 },
    { title: '患者', dataIndex: 'patientId', width: 110 },
    {
      title: '上报时间',
      dataIndex: 'reportedAt',
      width: 160,
      render: (v: string) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    { title: '事件经过', dataIndex: 'eventDescription', ellipsis: true },
    { title: '根本原因', dataIndex: 'rootCause', ellipsis: true },
    { title: '改进措施', dataIndex: 'improvementAction', ellipsis: true },
    { title: '上报人', dataIndex: 'reporterId', width: 110 },
  ];

  return (
    <PageContainer
      title="护理质量敏感指标（NQI）"
      description="5 项指标字典 · 点击卡片切换事件列表 · 上报事件（不计算率值，率由后端统计口径产出）"
      extra={<Tag color={demo ? 'orange' : 'green'}>{demo ? '演示数据（DEMO）' : 'BFF 真实数据'}</Tag>}
    >
      <DemoModeBanner />
      {error && <Alert type="error" showIcon banner style={{ marginBottom: 12 }} message={error} />}
      {!canView && (
        <Alert type="warning" showIcon style={{ marginBottom: 12 }} message="当前账号缺少 nqi:view 权限" />
      )}

      <Spin spinning={loading}>
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {indicators.map((ind) => {
            const meta = INDICATOR_META[ind.code];
            const active = ind.code === selectedCode;
            return (
              <Col xs={24} sm={12} lg={8} xl={24 / 5} key={ind.code}>
                <Card
                  size="small"
                  hoverable
                  style={{
                    borderColor: active ? meta.color : undefined,
                    boxShadow: active ? `0 0 0 1px ${meta.color}` : undefined,
                  }}
                  onClick={() => void selectIndicator(ind.code)}
                >
                  <Space direction="vertical" size={4} style={{ width: '100%' }}>
                    <Space>
                      <Tag color={meta.color}>{ind.code}</Tag>
                      <b>{meta.label}</b>
                      <Tag>{ind.unit}</Tag>
                    </Space>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      分子：{ind.numerator} · 分母：{ind.denominator}
                    </Typography.Text>
                    <Typography.Text style={{ fontSize: 12 }}>{ind.description}</Typography.Text>
                  </Space>
                </Card>
              </Col>
            );
          })}
        </Row>

        <Card
          size="small"
          title={
            <Space>
              <Tag color={selectedMeta.color}>{selectedCode}</Tag>
              <span>{selectedMeta.label}事件列表</span>
            </Space>
          }
          extra={
            <Button type="primary" onClick={() => setReportOpen(true)}>
              上报事件
            </Button>
          }
        >
          <Spin spinning={eventsLoading}>
            <Table
              rowKey={(r: NqiEvent) => r.id}
              dataSource={events}
              columns={columns}
              size="small"
              pagination={{ pageSize: 8, showSizeChanger: false }}
              scroll={{ x: 1100 }}
            />
          </Spin>
        </Card>
      </Spin>

      <Modal
        open={reportOpen}
        title={`上报「${selectedMeta.label}」事件`}
        onCancel={() => setReportOpen(false)}
        footer={null}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={doReport}
          initialValues={{ reporterId: currentUser?.realName ?? '' }}
        >
          <Form.Item name="patientId" label="患者标识" rules={[{ required: true, message: '请输入患者标识' }]}>
            <Input placeholder="如 P-A001" />
          </Form.Item>
          <Form.Item name="eventDescription" label="事件经过" rules={[{ required: true, message: '请输入事件经过' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="rootCause" label="根本原因" rules={[{ required: true, message: '请输入根本原因' }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="improvementAction" label="改进措施" rules={[{ required: true, message: '请输入改进措施' }]}>
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="reporterId" label="上报人工号/姓名" rules={[{ required: true, message: '请输入上报人' }]}>
            <Input />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={acting}>
              提交上报
            </Button>
            <Button onClick={() => setReportOpen(false)}>取消</Button>
          </Space>
        </Form>
      </Modal>
    </PageContainer>
  );
}
