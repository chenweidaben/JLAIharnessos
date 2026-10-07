/**
 * 健澜科技 jlmedaios - 手术麻醉管理工作站（M9-C 前端闭环）
 *
 * 全生命周期：申请→排班→术前三方核对→麻醉诱导→术中事件→阶段推进→
 * PACU 评分→术者/麻醉双签→离室 / 取消。真实 BFF + 真实 PG。
 * 健康门禁：BFF/DB 不可用时显式 Alert + Watermark，阻断写操作。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Layout,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Space,
  Spin,
  Tag,
  Typography,
  Watermark,
} from 'antd';
import { MedicineBoxOutlined } from '@ant-design/icons';
import { useSurgeryStore, type SubmitSurgeryInput } from '@/store/surgeryStore';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import SurgeryQueue from '@/components/surgery/SurgeryQueue';
import SurgeryDetailPanel from '@/components/surgery/SurgeryDetailPanel';

const { Header, Content } = Layout;

const watermarkText = ['健澜科技', '手术麻醉', 'jlmedaios'];

export default function SurgeryPage() {
  const { dbUp, healthChecking, checkHealth, load, submit } = useSurgeryStore();
  const [ready, setReady] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [form] = Form.useForm<SubmitSurgeryInput>();

  useEffect(() => {
    void (async () => {
      const up = await checkHealth();
      if (up) await load();
      setReady(true);
    })();
  }, [checkHealth, load]);

  const onRefresh = async () => {
    const up = await checkHealth();
    if (up) await load();
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await submit({
      ...values,
      requestNo: `SUR${Date.now().toString().slice(-8)}`,
      surgeryType: values.surgeryType ?? 'elective',
      plannedDate: values.plannedDate ? (values.plannedDate as unknown as { format: (f: string) => string }).format('YYYY-MM-DD') : null,
    });
    setSubmitOpen(false);
    form.resetFields();
  };

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <MedicineBoxOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              手术麻醉管理
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              申请→排班→三方核对→麻醉→PACU→双签离室 · 全生命周期闭环
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="surgery-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="surgery-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，手术麻醉工作站不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充手术麻醉记录。"
                action={
                  <button
                    type="button"
                    className="ant-btn ant-btn-default"
                    onClick={() => void onRefresh()}
                  >
                    重新探活
                  </button>
                }
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Typography.Text type="secondary" className="text-sm">
                    手术麻醉全流程操作 · 权限隔离 · 审计留痕
                  </Typography.Text>
                  <Space>
                    <Button onClick={() => void onRefresh()}>刷新</Button>
                    <Button type="primary" onClick={() => setSubmitOpen(true)}>
                      新建手术申请
                    </Button>
                  </Space>
                </div>
                <SurgeryQueue />
                <SurgeryDetailPanel />
              </div>
            )}
          </Spin>
        </Content>
      </Layout>

      <Modal
        open={submitOpen}
        title="新建手术申请"
        onCancel={() => setSubmitOpen(false)}
        onOk={() => void handleSubmit()}
        width={560}
      >
        <Form form={form} layout="vertical" className="mt-3">
          <Form.Item name="visitId" label="就诊ID" rules={[{ required: true, message: '请输入就诊ID' }]}>
            <Input placeholder="住院就诊 UUID" />
          </Form.Item>
          <Form.Item name="patientId" label="患者ID" rules={[{ required: true, message: '请输入患者ID' }]}>
            <Input placeholder="患者 UUID" />
          </Form.Item>
          <Form.Item name="surgeryType" label="手术类型" initialValue="elective" rules={[{ required: true }]}>
            <Select
              options={[
                { value: 'elective', label: '择期手术' },
                { value: 'emergency', label: '急诊手术' },
              ]}
            />
          </Form.Item>
          <Form.Item name="plannedProcedure" label="拟定术式" rules={[{ required: true, message: '请输入拟定术式' }]}>
            <Input placeholder="如：腹腔镜胆囊切除术" />
          </Form.Item>
          <Form.Item name="diagnosis" label="术前诊断">
            <Input placeholder="如：胆囊结石伴胆囊炎" />
          </Form.Item>
          <Form.Item name="plannedDate" label="计划手术日期">
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="department" label="手术科室">
            <Input placeholder="如：普外科" />
          </Form.Item>
        </Form>
      </Modal>
    </Watermark>
  );
}
