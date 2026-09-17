/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 系统配置：系统参数 / 业务参数 / 安全参数 / 界面参数 / AI参数
 */
import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Switch,
  Tabs,
  Table,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SaveOutlined,
  ReloadOutlined,
  HistoryOutlined,
  SettingOutlined,
  SafetyCertificateOutlined,
  DesktopOutlined,
  RobotOutlined,
  ShopOutlined,
} from '@ant-design/icons';
import type { SystemConfig, ConfigHistoryItem } from '@/types/system';
import { useSystemStore } from '@/store/systemStore';

export default function SystemConfig() {
  const { systemConfig, fetchSystemConfig, updateSystemConfig } = useSystemStore();
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('basic');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void fetchSystemConfig();
  }, [fetchSystemConfig]);

  useEffect(() => {
    if (systemConfig) {
      form.setFieldsValue({
        ...systemConfig,
        ...systemConfig.passwordPolicy,
        ...systemConfig.loginPolicy,
        ...systemConfig.dataRetention,
        ...systemConfig.uiParams,
        ...systemConfig.aiParams,
      });
    }
  }, [systemConfig, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      Modal.confirm({
        title: '确认保存配置',
        content: '保存后系统配置将立即生效，是否继续？',
        onOk: async () => {
          setSaving(true);
          await updateSystemConfig(values as Partial<SystemConfig>);
          setSaving(false);
          message.success('系统配置已保存');
        },
      });
    } catch {
      message.error('请检查表单输入');
    }
  };

  const handleReset = () => {
    form.setFieldsValue({
      ...systemConfig,
      ...systemConfig.passwordPolicy,
      ...systemConfig.loginPolicy,
      ...systemConfig.dataRetention,
      ...systemConfig.uiParams,
      ...systemConfig.aiParams,
    });
    message.info('已恢复为当前配置');
  };

  const historyColumns: ColumnsType<ConfigHistoryItem> = [
    { title: '修改时间', dataIndex: 'time', width: 160 },
    { title: '配置项', dataIndex: 'field', width: 140 },
    { title: '旧值', dataIndex: 'oldValue', ellipsis: true },
    { title: '新值', dataIndex: 'newValue', ellipsis: true },
    { title: '操作人', dataIndex: 'operator', width: 100 },
  ];

  const tabItems = [
    {
      key: 'basic',
      label: (
        <span>
          <ShopOutlined /> 系统参数
        </span>
      ),
      children: (
        <Row gutter={24}>
          <Col span={12}>
            <Card size="small" title="系统信息" className="mb-3">
              <Form.Item name="systemName" label="系统名称">
                <Input />
              </Form.Item>
              <Form.Item name="systemLogo" label="系统Logo">
                <Input />
              </Form.Item>
              <Form.Item name="systemVersion" label="系统版本">
                <Input disabled />
              </Form.Item>
              <Form.Item name="recordNumber" label="备案号">
                <Input />
              </Form.Item>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title="医院信息" className="mb-3">
              <Form.Item name="hospitalName" label="医院名称">
                <Input />
              </Form.Item>
              <Form.Item name="hospitalLevel" label="医院等级">
                <Select
                  options={['三级甲等', '三级乙等', '二级甲等', '二级乙等'].map((v) => ({
                    label: v,
                    value: v,
                  }))}
                />
              </Form.Item>
              <Form.Item name="hospitalAddress" label="医院地址">
                <Input />
              </Form.Item>
              <Form.Item name="contactPhone" label="联系电话">
                <Input />
              </Form.Item>
              <Form.Item name="contactEmail" label="邮箱">
                <Input />
              </Form.Item>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'business',
      label: (
        <span>
          <SettingOutlined /> 业务参数
        </span>
      ),
      children: (
        <Row gutter={24}>
          <Col span={12}>
            <Card size="small" title="门诊与住院" className="mb-3">
              <Form.Item name="defaultDepartment" label="默认科室">
                <Input />
              </Form.Item>
              <Form.Item name="defaultQuotaPerDay" label="默认号源数量">
                <InputNumber min={1} max={500} className="w-full" />
              </Form.Item>
              <Form.Item name="outpatientStartTime" label="门诊开始时间">
                <Input placeholder="08:00" />
              </Form.Item>
              <Form.Item name="outpatientEndTime" label="门诊结束时间">
                <Input placeholder="17:30" />
              </Form.Item>
              <Form.Item name="admissionStartTime" label="住院开始时间">
                <Input placeholder="08:00" />
              </Form.Item>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title="告警与流程" className="mb-3">
              <Form.Item name="criticalValueNotifyMethod" label="危急值通知方式">
                <Select
                  mode="multiple"
                  options={['站内信', '短信', '邮件', '企业微信', '钉钉', 'APP推送'].map((v) => ({
                    label: v,
                    value: v,
                  }))}
                />
              </Form.Item>
              <Form.Item name="prescriptionAuditFlow" label="处方审核流程">
                <Radio.Group>
                  <Radio.Button value="none">无需审核</Radio.Button>
                  <Radio.Button value="single">单人审核</Radio.Button>
                  <Radio.Button value="double">双人审核</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'security',
      label: (
        <span>
          <SafetyCertificateOutlined /> 安全参数
        </span>
      ),
      children: (
        <Row gutter={24}>
          <Col span={8}>
            <Card size="small" title="密码策略" className="mb-3">
              <Form.Item name="minLength" label="最小长度">
                <InputNumber min={6} max={32} className="w-full" />
              </Form.Item>
              <Form.Item name="requireUppercase" label="需大写字母" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="requireLowercase" label="需小写字母" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="requireDigit" label="需数字" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="requireSpecialChar" label="需特殊字符" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="expireDays" label="有效期(天)">
                <InputNumber min={30} max={365} className="w-full" />
              </Form.Item>
              <Form.Item name="historyCount" label="历史密码限制">
                <InputNumber min={0} max={10} className="w-full" />
              </Form.Item>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title="登录策略" className="mb-3">
              <Form.Item name="maxFailedAttempts" label="最大失败次数">
                <InputNumber min={3} max={10} className="w-full" />
              </Form.Item>
              <Form.Item name="lockDurationMinutes" label="锁定时间(分钟)">
                <InputNumber min={5} max={120} className="w-full" />
              </Form.Item>
              <Form.Item name="sessionTimeoutMinutes" label="会话超时(分钟)">
                <InputNumber min={5} max={120} className="w-full" />
              </Form.Item>
              <Form.Item name="kickRepeatedLogin" label="踢出重复登录" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="twoFactorAuth" label="双因素认证" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Card>
          </Col>
          <Col span={8}>
            <Card size="small" title="数据保留策略" className="mb-3">
              <Form.Item name="logRetentionDays" label="日志保留(天)">
                <InputNumber min={30} max={3650} className="w-full" />
              </Form.Item>
              <Form.Item name="medicalRecordRetentionYears" label="病历保留(年)">
                <InputNumber min={5} max={100} className="w-full" />
              </Form.Item>
              <Form.Item name="backupRetentionDays" label="备份保留(天)">
                <InputNumber min={30} max={3650} className="w-full" />
              </Form.Item>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'ui',
      label: (
        <span>
          <DesktopOutlined /> 界面参数
        </span>
      ),
      children: (
        <Row gutter={24}>
          <Col span={12}>
            <Card size="small" title="显示设置" className="mb-3">
              <Form.Item name="defaultTheme" label="默认主题">
                <Radio.Group>
                  <Radio.Button value="light">浅色</Radio.Button>
                  <Radio.Button value="dark">深色</Radio.Button>
                </Radio.Group>
              </Form.Item>
              <Form.Item name="defaultLanguage" label="默认语言">
                <Select
                  options={[
                    { label: '简体中文', value: 'zh-CN' },
                    { label: 'English', value: 'en-US' },
                  ]}
                />
              </Form.Item>
              <Form.Item name="tableDensity" label="表格密度">
                <Radio.Group>
                  <Radio.Button value="default">宽松</Radio.Button>
                  <Radio.Button value="middle">中等</Radio.Button>
                  <Radio.Button value="small">紧凑</Radio.Button>
                </Radio.Group>
              </Form.Item>
              <Form.Item name="fontSize" label="字体大小">
                <Select
                  options={[12, 13, 14, 15, 16].map((v) => ({ label: `${v}px`, value: v }))}
                />
              </Form.Item>
              <Form.Item name="animationEnabled" label="动画效果" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Card>
          </Col>
        </Row>
      ),
    },
    {
      key: 'ai',
      label: (
        <span>
          <RobotOutlined /> AI参数
        </span>
      ),
      children: (
        <Row gutter={24}>
          <Col span={12}>
            <Card size="small" title="模型配置" className="mb-3">
              <Form.Item name="defaultModel" label="默认模型">
                <Select
                  options={[
                    { label: 'Claude Sonnet', value: 'claude-sonnet' },
                    { label: 'Claude Opus', value: 'claude-opus' },
                    { label: 'Claude Haiku', value: 'claude-haiku' },
                    { label: '健澜医疗大模型', value: 'jianlan-medical' },
                  ]}
                />
              </Form.Item>
              <Form.Item name="temperature" label="温度参数(Temperature)">
                <InputNumber min={0} max={1} step={0.1} className="w-full" />
              </Form.Item>
              <Form.Item name="maxTokens" label="最大Token数">
                <InputNumber min={256} max={128000} step={256} className="w-full" />
              </Form.Item>
              <Form.Item name="contextWindow" label="上下文窗口">
                <InputNumber min={8000} max={1000000} step={1000} className="w-full" />
              </Form.Item>
            </Card>
          </Col>
          <Col span={12}>
            <Card size="small" title="输出设置" className="mb-3">
              <Form.Item name="streamingEnabled" label="流式输出" valuePropName="checked">
                <Switch />
              </Form.Item>
              <Form.Item name="showThinking" label="显示思考过程" valuePropName="checked">
                <Switch />
              </Form.Item>
            </Card>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="m-0 text-lg font-semibold text-ink-primary">系统配置</h2>
          <p className="mt-1 mb-0 text-sm text-ink-secondary">系统全局参数管理，修改后立即生效</p>
        </div>
        <Space>
          <Button icon={<HistoryOutlined />} onClick={() => setHistoryOpen(true)}>
            修改历史
          </Button>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            恢复当前
          </Button>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave}>
            保存配置
          </Button>
        </Space>
      </div>

      <Card className="shadow-card">
        <Form form={form} layout="vertical">
          <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
        </Form>
      </Card>

      <Modal
        open={historyOpen}
        title="配置修改历史"
        width={720}
        onCancel={() => setHistoryOpen(false)}
        footer={
          <Button type="primary" onClick={() => setHistoryOpen(false)}>
            关闭
          </Button>
        }
      >
        <Table<ConfigHistoryItem>
          rowKey="id"
          size="small"
          columns={historyColumns}
          dataSource={systemConfig.updateHistory}
          pagination={false}
        />
      </Modal>
    </div>
  );
}
