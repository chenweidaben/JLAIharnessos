/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * AI 辅助问诊：智能追问、病史生成、鉴别诊断、检查用药建议、对话式交互。
 */
import React, { useRef, useState } from 'react';
import { Avatar, Button, Card, Input, Space, Tag, Tooltip, message } from 'antd';
import {
  RobotOutlined,
  UserOutlined,
  LikeOutlined,
  DislikeOutlined,
  SendOutlined,
  BulbOutlined,
} from '@ant-design/icons';
import type { AIChatMessage } from '@/types/outpatient';
import { useOutpatientStore } from '@/store/outpatientStore';
import {
  mockAIFollowups,
  mockAIMedSuggestions,
  mockAIExamSuggestions,
} from '@/mock/outpatientMock';
import { severityColor } from './constants';

const SUGGESTED_QUERIES = [
  '胸痛如何鉴别心绞痛与心梗？',
  '该患者下一步该做什么检查？',
  '血压心率控制目标是多少？',
  '阿司匹林和氯吡格雷要吃多久？',
];

export const AIAssistant: React.FC = () => {
  const messages = useOutpatientStore((s) => s.aiMessages);
  const addChatMessage = useOutpatientStore((s) => s.addChatMessage);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = (text: string) => {
    const q = text.trim();
    if (!q) return;
    addChatMessage({
      msgId: `Q${Date.now()}`,
      role: 'doctor',
      content: q,
      time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    });
    setInput('');
    // 模拟 AI 回复
    setTimeout(() => {
      addChatMessage({
        msgId: `A${Date.now()}`,
        role: 'ai',
        content: `已结合当前患者（冠心病支架术后、高血压、糖尿病）与主诉分析：${q}。建议优先完善心肌酶/BNP，强化二级预防用药，注意出血与肾功能监测。详细方案见右栏。`,
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      });
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 600);
  };

  return (
    <div className="flex flex-col h-full">
      {/* 智能追问 */}
      <Card
        size="small"
        title={
          <Space>
            <BulbOutlined style={{ color: '#0A4D8C' }} />
            <span className="text-sm font-semibold">AI 智能追问</span>
          </Space>
        }
        className="mb-2"
      >
        <Space direction="vertical" className="w-full">
          {mockAIFollowups.map((q) => (
            <div key={q.questionId} className="p-2 bg-blue-50 rounded text-xs">
              <div className="font-medium text-ink-primary">{q.question}</div>
              {q.reason && <div className="text-ink-secondary mt-0.5">目的：{q.reason}</div>}
            </div>
          ))}
        </Space>
      </Card>

      {/* 检查/用药建议 */}
      <Card
        size="small"
        title={<span className="text-sm font-semibold">建议检查与用药</span>}
        className="mb-2"
      >
        <div className="text-xs font-medium mb-1" style={{ color: severityColor.info }}>
          检查建议
        </div>
        <ul className="list-disc pl-5 text-xs mb-2">
          {mockAIExamSuggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
        <div className="text-xs font-medium mb-1" style={{ color: severityColor.success }}>
          用药建议
        </div>
        <ul className="list-disc pl-5 text-xs">
          {mockAIMedSuggestions.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </Card>

      {/* 对话区 */}
      <Card
        size="small"
        title={
          <Space>
            <RobotOutlined style={{ color: '#0A4D8C' }} />
            <span className="text-sm font-semibold">与 AI 医生对话</span>
          </Space>
        }
        styles={{ body: { padding: 12 } }}
      >
        <div className="h-56 overflow-y-auto mb-2 space-y-2">
          {messages.map((m: AIChatMessage) => (
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
                className={`max-w-[80%] p-2 rounded text-xs ${m.role === 'ai' ? 'bg-blue-50' : 'bg-gray-100'}`}
              >
                <div>{m.content}</div>
                <div className="text-[10px] text-ink-secondary mt-1">{m.time}</div>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* 快捷问法 */}
        <div className="flex flex-wrap gap-1 mb-2">
          {SUGGESTED_QUERIES.map((q) => (
            <Tag key={q} color="blue" className="cursor-pointer" onClick={() => send(q)}>
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
            style={{ background: '#0A4D8C' }}
            onClick={() => send(input)}
          />
        </Space.Compact>

        <div className="mt-2 text-center">
          <Space>
            <Tooltip title="采纳本次建议">
              <Button
                size="small"
                icon={<LikeOutlined />}
                onClick={() => message.success('已采纳，将写入病历')}
              />
            </Tooltip>
            <Tooltip title="忽略本次建议">
              <Button
                size="small"
                icon={<DislikeOutlined />}
                onClick={() => message.info('已忽略')}
              />
            </Tooltip>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default AIAssistant;
