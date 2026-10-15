/**
 * 健澜科技 jlmedaios - M115-B 经验/教训主动录入页
 *
 * 依据宪法第七章（全角色 Personal Agent）：员工把一次真实工作场景的
 *   「场景描述 → 我的决策 → 结果 → 教训心得 → 关联标签」手工沉淀进个人
 *   决策记忆库（POST /api/v1/muse/lesson，source='manual'），
 *   与 Agent 自动捕获的决策记忆同库召回、越用越懂这位员工。
 *
 * 三态说明：
 *  - loading：提交中（按钮 loading + 整卡禁用）；
 *  - error：后端 / 网络失败时顶部 Alert 展示字段级错误；
 *  - empty：表单初始空态（占位文案引导），提交成功后跳回 MEDMUSE 主页。
 *
 * 深海蓝 VI：标题栏 #0A2540，主按钮 #4A90D9，辅助底 #E8F0F8。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert, Button, Card, Form, Input, Layout, Select, Space, Typography, message,
} from 'antd';

import { post } from '@/services/request';

const { Header, Content } = Layout;
const { Title, Paragraph, Text } = Typography;
const { TextArea } = Input;

/** 深海蓝 VI 色板（与全仓 muse 页面一致） */
const VI = {
  navy: '#0A2540',
  primary: '#4A90D9',
  softBg: '#E8F0F8',
} as const;

/** 结果三态：与后端 staff_decision_memory.outcome CHECK 一致 */
const OUTCOME_OPTIONS = [
  { value: 'success', label: '成功', color: '#52c41a' },
  { value: 'failure', label: '失败', color: '#ff4d4f' },
  { value: 'mixed', label: '混合', color: '#faad14' },
] as const;

/** 提交体（与 BFF validateLessonInput 口径一致） */
interface LessonPayload {
  scenario: string;
  decision: string;
  outcome: 'success' | 'failure' | 'mixed';
  lesson: string;
  tags: string;
}

interface LessonSubmitResp {
  id: string;
  persisted: boolean;
  source: string;
  tags: string[];
  createdAt: string;
}

export default function LessonNewPage() {
  const navigate = useNavigate();
  const [form] = Form.useForm<LessonPayload>();
  // 三态：loading 提交中 / error 后端错误（empty 即表单初始态）
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: LessonPayload) => {
    setSubmitting(true);
    setError(null);
    try {
      const resp = await post<LessonSubmitResp>(
        '/api/v1/muse/lesson',
        {
          scenario: values.scenario.trim(),
          decision: values.decision.trim(),
          outcome: values.outcome,
          lesson: values.lesson?.trim() ?? '',
          tags: values.tags ?? '',
        },
        { silent: true },
      );
      message.success(
        resp?.persisted === false
          ? '经验/教训已录入（演示模式，未持久化）'
          : '经验/教训已录入，已沉淀进你的个人决策记忆',
      );
      // 提交后跳回 MEDMUSE 主页
      navigate('/medmuse');
    } catch (err) {
      setError(err instanceof Error ? err.message : '提交失败，请稍后重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f5f7fa' }}>
      {/* 深海蓝标题栏 */}
      <Header style={{ background: VI.navy, padding: '0 24px' }}>
        <Title level={4} style={{ color: '#fff', margin: '14px 0' }}>
          经验/教训主动录入
        </Title>
      </Header>

      <Content style={{ padding: 24, maxWidth: 860 }}>
        {/* error 态：字段级 / 网络错误横幅 */}
        {error && (
          <Alert
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
            message="录入未提交"
            description={error}
            closable
            onClose={() => setError(null)}
          />
        )}

        <Card bordered={false}>
          <Paragraph type="secondary" style={{ marginTop: 0 }}>
            依据宪法第七章：把一次值得沉淀的真实工作场景记录下来——<Text strong>场景、决策、结果、教训</Text>，
            个人经验库会越用越懂你。内容只沉淀到本人画像，不跨员工读取。
          </Paragraph>

          <Form<LessonPayload>
            form={form}
            layout="vertical"
            disabled={submitting}
            onFinish={(v) => void handleSubmit(v)}
            initialValues={{ outcome: undefined, lesson: '', tags: '' }}
          >
            {/* empty 态：占位文案引导（表单初始为空） */}
            <Form.Item
              name="scenario"
              label="场景描述"
              rules={[
                { required: true, whitespace: true, message: '场景描述不能为空' },
                { max: 500, message: '场景描述不能超过 500 字' },
              ]}
            >
              <TextArea
                rows={3}
                showCount
                maxLength={500}
                placeholder="例如：一位 DIP 病组患者提出自费换药，家属沟通后仍坚持……"
              />
            </Form.Item>

            <Form.Item
              name="decision"
              label="我的决策"
              rules={[
                { required: true, whitespace: true, message: '我的决策不能为空' },
                { max: 500, message: '我的决策不能超过 500 字' },
              ]}
            >
              <TextArea
                rows={3}
                showCount
                maxLength={500}
                placeholder="例如：先请主管医师评估换药指征，签自费知情同意书后再执行……"
              />
            </Form.Item>

            <Form.Item
              name="outcome"
              label="结果"
              rules={[{ required: true, message: '请选择结果' }]}
            >
              <Select
                placeholder="这次决策最终：成功 / 失败 / 混合？"
                options={OUTCOME_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </Form.Item>

            <Form.Item
              name="lesson"
              label="教训心得"
              tooltip="选填：事后复盘——下次同类场景我会怎么做"
              rules={[{ max: 2000, message: '教训心得不能超过 2000 字' }]}
            >
              <TextArea
                rows={4}
                showCount
                maxLength={2000}
                placeholder="例如：自费换药前必须留痕家属沟通记录，否则后续纠纷无据可依……"
              />
            </Form.Item>

            <Form.Item
              name="tags"
              label="关联标签"
              tooltip="选填：多个标签用逗号 / 顿号分隔，后端自动清洗去重"
            >
              <Input placeholder="如：抗凝出血风险、DIP 自费方案" allowClear />
            </Form.Item>

            <Space size="middle" style={{ marginTop: 8 }}>
              {/* loading 态：提交按钮 loading */}
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{ background: VI.primary, borderColor: VI.primary }}
              >
                提交录入
              </Button>
              <Button disabled={submitting} onClick={() => navigate('/medmuse')}>
                取消
              </Button>
              <Text type="secondary" style={{ background: VI.softBg, padding: '2px 8px', borderRadius: 4 }}>
                source = manual · 仅沉淀到本人决策记忆
              </Text>
            </Space>
          </Form>
        </Card>
      </Content>
    </Layout>
  );
}
