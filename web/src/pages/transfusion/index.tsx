/**
 * 健澜科技 jlmedaios - 输血管理工作站（M10-A）
 *
 * 申请（CDS 指征）→ 交叉配血 → 发血扣库 → 双人核对输注 → 完成/停输 → 不良反应。
 * 真实 BFF + 真实 PG。健康门禁：BFF/DB 不可用时显式 Alert + Watermark，阻断写操作。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Form,
  Input,
  InputNumber,
  Layout,
  Modal,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  Watermark,
} from 'antd';
import { DropboxOutlined } from '@ant-design/icons';
import { useTransfusionStore, type ApplyInput } from '@/store/transfusionStore';
import DemoModeBanner from '@/components/common/DemoModeBanner';
import TransfusionQueue from '@/components/transfusion/TransfusionQueue';
import TransfusionDetailPanel from '@/components/transfusion/TransfusionDetail';

const { Header, Content } = Layout;

const watermarkText = ['健澜科技', '输血管理', 'jlmedaios'];

export default function TransfusionPage() {
  const { dbUp, healthChecking, checkHealth, load, apply } = useTransfusionStore();
  const [ready, setReady] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [form] = Form.useForm<ApplyInput>();

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

  const handleApply = async () => {
    let values: ApplyInput;
    try {
      values = await form.validateFields();
    } catch {
      // 表单校验失败：antd 已就地展示错误，无需额外处理
      return;
    }
    await apply({
      ...values,
      requestNo: `BLOOD${Date.now().toString().slice(-8)}`,
      indicationMeta: {
        hb: values.indicationMetaHb,
        inr: values.indicationMetaInr,
        plt: values.indicationMetaPlt,
        activeBleeding: values.indicationMetaBleeding === 'yes',
        bloodLoss: values.indicationMetaLoss,
      },
    });
    setApplyOpen(false);
    form.resetFields();
  };

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen bg-ink-bg">
        <Header className="flex items-center justify-between bg-jl-primary px-6 shadow-card">
          <div className="flex items-center gap-3">
            <DropboxOutlined className="text-2xl text-white" />
            <Typography.Title level={4} className="!mb-0 !text-white">
              输血管理
            </Typography.Title>
            <span className="hidden text-sm text-white/70 md:block">
              申请→配血→发血→双人核对输注→不良反应 · 全流程闭环
            </span>
          </div>
          <Tag color={dbUp ? 'green' : 'red'} data-testid="transfusion-health-tag">
            {dbUp ? 'BFF/DB 正常 (up)' : 'BFF/DB 不可用'}
          </Tag>
        </Header>
        <Content className="p-4">
          <DemoModeBanner />
          <Spin spinning={!ready || healthChecking}>
            {!dbUp ? (
              <Alert
                data-testid="transfusion-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，输血管理工作站不可用"
                description="请检查数据库服务；恢复后点击刷新重新探活。系统不会以缓存或假数据冒充输血记录。"
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
                    输血安全全流程操作 · 双人核对 · CDS 指征留痕 · 审计链
                  </Typography.Text>
                  <Space>
                    <Button onClick={() => void onRefresh()}>刷新</Button>
                    <Button type="primary" onClick={() => setApplyOpen(true)}>
                      新建输血申请
                    </Button>
                  </Space>
                </div>
                <TransfusionQueue />
                <TransfusionDetailPanel />
              </div>
            )}
          </Spin>
        </Content>
      </Layout>

      <Modal
        open={applyOpen}
        title="新建输血申请"
        onCancel={() => setApplyOpen(false)}
        onOk={() => void handleApply()}
        width={620}
      >
        <Form form={form} layout="vertical" className="mt-3">
          <Form.Item name="visitId" label="就诊ID" rules={[{ required: true, message: '请输入就诊ID' }]}>
            <Input placeholder="住院就诊 UUID" />
          </Form.Item>
          <Form.Item name="patientId" label="患者ID" rules={[{ required: true, message: '请输入患者ID' }]}>
            <Input placeholder="患者 UUID" />
          </Form.Item>
          <Form.Item name="department" label="申请科室">
            <Input placeholder="如：普外科" />
          </Form.Item>
          <Space size="large" className="w-full">
            <Form.Item name="component" label="血液成分" className="w-40" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'red_cell', label: '红细胞' },
                  { value: 'plasma', label: '血浆' },
                  { value: 'platelet', label: '血小板' },
                  { value: 'cryo', label: '冷沉淀' },
                  { value: 'whole', label: '全血' },
                ]}
              />
            </Form.Item>
            <Form.Item name="bloodType" label="血型" className="w-32" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'A', label: 'A型' },
                  { value: 'B', label: 'B型' },
                  { value: 'AB', label: 'AB型' },
                  { value: 'O', label: 'O型' },
                ]}
              />
            </Form.Item>
            <Form.Item name="unitCount" label="剂量(U)" className="w-32" rules={[{ required: true }]}>
              <InputNumber min={1} className="w-full" />
            </Form.Item>
            <Form.Item name="urgency" label="紧急度" className="w-32" initialValue="routine" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'routine', label: '常规' },
                  { value: 'urgent', label: '紧急' },
                  { value: 'emergency', label: '特急' },
                ]}
              />
            </Form.Item>
          </Space>
          <Form.Item name="indication" label="输血指征" rules={[{ required: true, message: '请输入输血指征' }]}>
            <Input.TextArea rows={2} placeholder="如：重度贫血 Hb 65 g/L，伴心悸乏力" />
          </Form.Item>
          <Space size="large" className="w-full" wrap>
            <Form.Item name="indicationMetaHb" label="Hb(g/L)">
              <InputNumber min={0} className="w-28" />
            </Form.Item>
            <Form.Item name="indicationMetaInr" label="INR">
              <InputNumber min={0} step={0.1} className="w-28" />
            </Form.Item>
            <Form.Item name="indicationMetaPlt" label="PLT(×10⁹/L)">
              <InputNumber min={0} className="w-28" />
            </Form.Item>
            <Form.Item name="indicationMetaBleeding" label="活动性出血" className="w-32">
              <Select
                allowClear
                options={[
                  { value: 'yes', label: '是' },
                  { value: 'no', label: '否' },
                ]}
              />
            </Form.Item>
            <Form.Item name="indicationMetaLoss" label="失血量(ml)">
              <InputNumber min={0} className="w-28" />
            </Form.Item>
          </Space>
        </Form>
      </Modal>
    </Watermark>
  );
}
