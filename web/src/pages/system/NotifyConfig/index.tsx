/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 系统管理 - 通知渠道配置页面
 * 微信/钉钉 Webhook 地址 + 危急值/待审批/随访提醒开关 + 测试发送
 * 路由建议：/system/notify
 */
import { useEffect } from 'react';
import { Button, Card, Form, Input, Space, Switch, Tag, message } from 'antd';
import { useNotifyConfigStore } from '@/store/notifyConfigStore';
import type { NotifyEventKind } from '@/services/api/notifyConfig';

const EVENT_LABELS: Array<{ key: NotifyEventKind; label: string; desc: string }> = [
  { key: 'criticalValue', label: '危急值推送', desc: '检验/检查出现危急值时实时推送' },
  { key: 'pendingApproval', label: '待审批提醒', desc: '有新审批单待处理时提醒责任人' },
  { key: 'followup', label: '随访提醒', desc: '到期随访任务提醒责任医生' },
];

export default function NotifyConfigPage() {
  const { config, loading, saving, fetchConfig, saveConfig, toggleEvent, testSend } =
    useNotifyConfigStore();
  const [form] = Form.useForm();

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  // 后端配置回来后回填表单
  useEffect(() => {
    form.setFieldsValue({
      wechatWebhookUrl: config.wechatWebhookUrl,
      dingTalkWebhookUrl: config.dingTalkWebhookUrl,
    });
  }, [config, form]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      await saveConfig(values);
      message.success('通知配置已保存（内存态，重启后还原默认）');
    } catch {
      message.error('请检查表单输入');
    }
  };

  const handleTest = async (event: NotifyEventKind) => {
    try {
      const res = await testSend(event);
      // DEMO 下后端只 console.info 打印，前端据此提示
      if (res.demo) {
        message.success('已打印日志（DEMO 模式未真实发送）');
      }
    } catch {
      message.error('测试发送失败');
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="通知渠道配置" loading={loading}>
        <Form form={form} layout="vertical" style={{ maxWidth: 720 }}>
          <Form.Item
            label="企业微信 Webhook"
            name="wechatWebhookUrl"
            tooltip="企业微信群机器人 Webhook 地址"
            rules={[{ type: 'url', message: '请输入合法的 URL', warningOnly: true }]}
          >
            <Input placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..." allowClear />
          </Form.Item>

          <Form.Item
            label="钉钉 Webhook"
            name="dingTalkWebhookUrl"
            tooltip="钉钉自定义群机器人 Webhook 地址"
            rules={[{ type: 'url', message: '请输入合法的 URL', warningOnly: true }]}
          >
            <Input placeholder="https://oapi.dingtalk.com/robot/send?access_token=..." allowClear />
          </Form.Item>

          <Form.Item>
            <Button type="primary" loading={saving} onClick={handleSave}>
              保存配置
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="业务事件开关" style={{ marginTop: 16 }}>
        <Space direction="vertical" size="middle" style={{ display: 'flex' }}>
          {EVENT_LABELS.map((ev) => (
            <div
              key={ev.key}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <div>
                <Space>
                  <span style={{ fontWeight: 500 }}>{ev.label}</span>
                  <Tag color={config.enabled[ev.key] ? 'green' : 'default'}>
                    {config.enabled[ev.key] ? '已启用' : '已停用'}
                  </Tag>
                </Space>
                <div style={{ color: '#888', fontSize: 12 }}>{ev.desc}</div>
              </div>
              <Space>
                <Switch
                  checked={config.enabled[ev.key]}
                  onChange={() => void toggleEvent(ev.key)}
                />
                <Button onClick={() => void handleTest(ev.key)}>测试发送</Button>
              </Space>
            </div>
          ))}
        </Space>
      </Card>
    </div>
  );
}
