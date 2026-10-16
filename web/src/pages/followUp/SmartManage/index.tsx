/**
 * 健澜科技 jlmedaios — 智能随访管理页（M152-D）
 *
 * AI能力深化：
 *   - 输入患者ID/疾病/出院日期，一键生成 AI 随访计划；
 *   - 展示 30 天再入院风险分层（低/中/高）；
 *   - 自动随访开关：默认关闭，需患者主动授权才开启；
 *   - 发送时段限制 08:00–20:00，不打扰患者休息。
 *
 * 深海蓝 VI：主色 #0B2A4A，辅助 #1E5A96，警示 #C0392B。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useState } from 'react';
import {
  Alert, Button, Card, Descriptions, Form, Input, List, Space, Tag, Typography, Watermark, message,
} from 'antd';
import { ApiOutlined, SafetyOutlined, ThunderboltOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

/** 深海蓝 VI 色板 */
const VI = {
  primary: '#0B2A4A',
  secondary: '#1E5A96',
  accent: '#3E8FD6',
  danger: '#C0392B',
  bg: '#F4F7FB',
};

interface PlanTimepoint {
  daysAfterDischarge: number;
  label: string;
  action: string;
}
interface Plan {
  patientId: string;
  disease: string;
  dischargeDate: string;
  timepoints: PlanTimepoint[];
  autoFollowupEnabled: boolean;
  channel: 'sms' | 'wechat' | 'phone';
}
interface Risk {
  score: number;
  level: 'low' | 'medium' | 'high';
  factors: string[];
  predictedWindowDays: number;
}

const LEVEL_COLOR: Record<Risk['level'], string> = {
  low: '#27AE60',
  medium: '#E67E22',
  high: VI.danger,
};
const LEVEL_LABEL: Record<Risk['level'], string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
};

export default function SmartFollowupManagePage() {
  const [patientId, setPatientId] = useState('');
  const [disease, setDisease] = useState('');
  const [dischargeDate, setDischargeDate] = useState('2026-10-16');
  const [plan, setPlan] = useState<Plan | null>(null);
  const [risk, setRisk] = useState<Risk | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    if (!patientId.trim()) {
      message.warning('请输入患者ID');
      return;
    }
    setLoading(true);
    try {
      const qs = new URLSearchParams({ disease, dischargeDate });
      const res = await fetch(`/api/v1/followup/auto-plan/${encodeURIComponent(patientId)}?${qs}`);
      const json = await res.json();
      if (json?.code === 0 || json?.data) {
        setPlan(json.data.plan);
        setRisk(json.data.risk);
      } else {
        message.error(json?.message || '生成失败');
      }
    } catch (e) {
      message.error('网络异常：' + (e instanceof Error ? e.message : ''));
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!plan) return;
    try {
      const res = await fetch('/api/v1/followup/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: plan.patientId,
          channel: plan.channel,
          template: `【健澜医院】尊敬的患者您好，您的随访计划已生成，请按时复诊。`,
        }),
      });
      const json = await res.json();
      const r = json?.data;
      if (r?.success) {
        message.success(`已发送（${r.channel}）：${r.messageId}`);
      } else {
        message.warning(`未发送：${r?.skippedReason || '未知原因'}`);
      }
    } catch (e) {
      message.error('发送失败：' + (e instanceof Error ? e.message : ''));
    }
  };

  return (
    <Watermark content={['健澜科技', 'jlmedaios']}>
      <div style={{ padding: 24, background: VI.bg, minHeight: '100vh' }}>
        <Card
          size="small"
          style={{ borderTop: `3px solid ${VI.primary}`, marginBottom: 16 }}
        >
          <Space direction="vertical" size={2}>
            <Title level={4} style={{ color: VI.primary, margin: 0 }}>
              <ThunderboltOutlined /> 智能随访管理（M152-D）
            </Title>
            <Text type="secondary">
              AI 自动生成分层随访计划 · 30 天再入院风险预测 · 患者授权后才自动发送
            </Text>
          </Space>
        </Card>

        <Alert
          type="info"
          showIcon
          icon={<SafetyOutlined />}
          style={{ marginBottom: 16, borderColor: VI.accent }}
          message="合规红线"
          description={
            <Paragraph style={{ marginBottom: 0 }}>
              自动随访默认关闭，需患者主动签署知情同意后开启；发送时段限定
              <Text strong> 08:00–20:00 </Text>
              ，夜间与清晨不打扰患者休息。风险预测为 AI 辅助决策，不替代医师判断。
            </Paragraph>
          }
        />

        <Card title={<span style={{ color: VI.primary }}>随访计划生成</span>} size="small">
          <Form layout="inline" style={{ rowGap: 12 }}>
            <Form.Item label="患者ID">
              <Input
                placeholder="如 pat-0001"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                style={{ width: 180 }}
              />
            </Form.Item>
            <Form.Item label="出院诊断">
              <Input
                placeholder="如 2型糖尿病 / 术后 / 肺腺癌"
                value={disease}
                onChange={(e) => setDisease(e.target.value)}
                style={{ width: 240 }}
              />
            </Form.Item>
            <Form.Item label="出院日期">
              <Input
                value={dischargeDate}
                onChange={(e) => setDischargeDate(e.target.value)}
                style={{ width: 140 }}
              />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                icon={<ApiOutlined />}
                loading={loading}
                onClick={handleGenerate}
                style={{ background: VI.primary, borderColor: VI.primary }}
              >
                生成 AI 随访计划
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {plan && (
          <Card
            size="small"
            style={{ marginTop: 16, borderLeft: `4px solid ${VI.secondary}` }}
            title={<span style={{ color: VI.primary }}>随访计划</span>}
          >
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="患者ID">{plan.patientId}</Descriptions.Item>
              <Descriptions.Item label="出院诊断">{plan.disease}</Descriptions.Item>
              <Descriptions.Item label="出院日期">{plan.dischargeDate}</Descriptions.Item>
              <Descriptions.Item label="自动随访">
                {plan.autoFollowupEnabled
                  ? <Tag color="green">已授权开启</Tag>
                  : <Tag color="default">未授权（默认关闭）</Tag>}
              </Descriptions.Item>
            </Descriptions>

            <List
              style={{ marginTop: 12 }}
              size="small"
              bordered
              dataSource={plan.timepoints}
              renderItem={(t) => (
                <List.Item>
                  <Space>
                    <Tag color={VI.secondary}>出院后 {t.daysAfterDischarge} 天</Tag>
                    <Text strong>{t.label}</Text>
                    <Text type="secondary">{t.action}</Text>
                  </Space>
                </List.Item>
              )}
            />

            <Space style={{ marginTop: 12 }}>
              <Button
                danger={!plan.autoFollowupEnabled}
                onClick={handleSend}
                disabled={!plan.autoFollowupEnabled}
              >
                发送自动随访（{plan.channel}）
              </Button>
              {!plan.autoFollowupEnabled && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  需患者主动授权后才能发送
                </Text>
              )}
            </Space>
          </Card>
        )}

        {risk && (
          <Card
            size="small"
            style={{ marginTop: 16, borderLeft: `4px solid ${LEVEL_COLOR[risk.level]}` }}
            title={<span style={{ color: VI.primary }}>30 天再入院风险预测</span>}
          >
            <Space align="center" size="large">
              <div style={{ textAlign: 'center' }}>
                <Text style={{ fontSize: 32, color: LEVEL_COLOR[risk.level], fontWeight: 600 }}>
                  {risk.score}
                </Text>
                <div><Text type="secondary">/ 100</Text></div>
              </div>
              <div>
                <Tag color={LEVEL_COLOR[risk.level]} style={{ fontSize: 14, padding: '4px 12px' }}>
                  {LEVEL_LABEL[risk.level]}
                </Tag>
                <Paragraph type="secondary" style={{ marginTop: 8, marginBottom: 0 }}>
                  预测窗口：{risk.predictedWindowDays} 天 · 因素：{risk.factors.join('；')}
                </Paragraph>
              </div>
            </Space>
          </Card>
        )}

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Copyright © 2026 杭州健澜科技有限公司 · jlmedaios
          </Text>
        </div>
      </div>
    </Watermark>
  );
}
