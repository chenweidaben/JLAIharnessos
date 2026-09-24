/**
 * 健澜科技 jlmedaios - AI 辅助问诊助手（真实 SSE 流式 + 工具过程透明）
 *
 * - 对话经 BFF 流式调用真实大模型，逐字渲染；
 * - 模型调用的医学工具（检索病历/药品/指南等）以过程卡片实时展示；
 * - 会话与消息真实落 agent.conversations / conversation_messages，刷新不丢；
 * - 服务异常 / 未配置模型时明确报错，不使用任何写死回复。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Avatar,
  Button,
  Card,
  Empty,
  Input,
  Space,
  Spin,
  Tag,
} from 'antd';
import {
  RobotOutlined,
  UserOutlined,
  SendOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import type { AiToolProcess } from '@/types/outpatient';
import { useOutpatientStore } from '@/store/outpatientStore';

const SUGGESTED_QUERIES = [
  '结合当前病情，下一步建议做哪些检查？',
  '该诊断需要与哪些疾病鉴别？',
  '当前用药有哪些注意事项和相互作用？',
  '治疗后复诊与随访如何安排？',
];

const ToolProcessItem: React.FC<{ p: AiToolProcess }> = ({ p }) => {
  const icon =
    p.status === 'running' ? (
      <LoadingOutlined style={{ color: '#0A4D8C' }} />
    ) : p.status === 'success' ? (
      <CheckCircleOutlined style={{ color: '#52C41A' }} />
    ) : (
      <CloseCircleOutlined style={{ color: '#F5222D' }} />
    );
  return (
    <div className="flex items-start gap-1.5 text-[11px] py-0.5">
      <span className="mt-0.5">{icon}</span>
      <div>
        <span className="font-medium">{p.toolName}</span>
        <span className="text-ink-secondary ml-1">
          {p.status === 'running'
            ? '执行中…'
            : p.status === 'success'
              ? '完成'
              : '失败'}
        </span>
        {p.summary && (
          <div className="text-ink-secondary mt-0.5 whitespace-pre-wrap">{p.summary}</div>
        )}
      </div>
    </div>
  );
};

export const AIAssistant: React.FC = () => {
  const messages = useOutpatientStore((s) => s.aiMessages);
  const streaming = useOutpatientStore((s) => s.aiStreaming);
  const toolProcesses = useOutpatientStore((s) => s.aiToolProcesses);
  const aiError = useOutpatientStore((s) => s.aiError);
  const sendAiMessage = useOutpatientStore((s) => s.sendAiMessage);
  const hasPatient = useOutpatientStore((s) => s.currentPatient !== null);

  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const send = (text: string): void => {
    const q = text.trim();
    if (!q || streaming) return;
    setInput('');
    void sendAiMessage(q);
  };

  // 新消息 / 流式增量时自动滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, toolProcesses]);

  return (
    <div className="flex flex-col h-full">
      <Card
        size="small"
        title={
          <Space>
            <RobotOutlined style={{ color: '#0A4D8C' }} />
            <span className="text-sm font-semibold">与 AI 医生对话</span>
            {hasPatient && <Tag color="green">已载入当前患者上下文</Tag>}
          </Space>
        }
        styles={{ body: { padding: 12 } }}
        className="flex-1 flex flex-col"
      >
        {!hasPatient && (
          <Alert
            type="warning"
            showIcon
            className="mb-2"
            message="尚未选择就诊患者"
            description="请先在候诊队列中开始一位患者的就诊，AI 将自动载入其真实病历上下文。"
          />
        )}

        {/* 工具调用过程 */}
        {toolProcesses.length > 0 && (
          <div className="mb-2 p-2 rounded bg-gray-50 border border-ink-border">
            <div className="flex items-center gap-1 text-[11px] font-semibold mb-1">
              <BulbOutlined style={{ color: '#0A4D8C' }} />
              工具调用过程
            </div>
            {toolProcesses.map((p) => (
              <ToolProcessItem key={p.callId} p={p} />
            ))}
          </div>
        )}

        {aiError && (
          <Alert
            type="error"
            showIcon
            className="mb-2"
            message="AI 服务异常"
            description={aiError}
          />
        )}

        {/* 对话区 */}
        <div ref={scrollRef} className="h-72 overflow-y-auto mb-2 space-y-2 pr-1">
          {messages.length === 0 && !streaming && (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={hasPatient ? '开始向 AI 提问吧' : '暂无对话'}
            />
          )}
          {messages.map((m) => (
            <div
              key={m.msgId}
              className={`flex gap-2 ${m.role === 'doctor' ? 'flex-row-reverse' : ''}`}
            >
              <Avatar
                size="small"
                icon={m.role === 'ai' ? <RobotOutlined /> : <UserOutlined />}
                style={m.role === 'ai' ? { background: '#0A4D8C' } : { background: '#8c8c8c' }}
              />
              <div
                className={`max-w-[82%] p-2 rounded text-xs whitespace-pre-wrap ${m.role === 'ai' ? 'bg-blue-50' : 'bg-gray-100'}`}
              >
                <div>
                  {m.content}
                  {m.role === 'ai' && streaming && m.content === '' && (
                    <Spin size="small" />
                  )}
                </div>
                <div className="text-[10px] text-ink-secondary mt-1">{m.time}</div>
              </div>
            </div>
          ))}
          {streaming && toolProcesses.length === 0 &&
            messages[messages.length - 1]?.content === '' && (
              <div className="text-xs text-ink-secondary">
                <Spin size="small" /> AI 思考中…
              </div>
            )}
          <div ref={bottomRef} />
        </div>

        {/* 快捷问法 */}
        <div className="flex flex-wrap gap-1 mb-2">
          {SUGGESTED_QUERIES.map((q) => (
            <Tag
              key={q}
              color="blue"
              className="cursor-pointer"
              onClick={() => send(q)}
            >
              {q}
            </Tag>
          ))}
        </div>

        <Space.Compact className="w-full">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onPressEnter={() => send(input)}
            placeholder="输入医学问题，或点击上方快捷问法…"
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            loading={streaming}
            style={{ background: '#0A4D8C' }}
            onClick={() => send(input)}
          />
        </Space.Compact>

        <div className="mt-2 text-[10px] text-ink-secondary text-center">
          AI 输出仅供临床辅助参考，最终诊断与处置以医师判断与签名为准。
        </div>
      </Card>
    </div>
  );
};

export default AIAssistant;
