/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 智能对话 Demo：纯前端 Mock，展示「思考 -> 工具调用 -> 流式回复」完整链路
 */
import { useEffect, useRef, useState } from 'react';
import { Button, Input, Tag } from 'antd';
import {
  ApiOutlined,
  CheckCircleFilled,
  LoadingOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons';

import GradientBackground from '@/components/demo/GradientBackground';
import {
  chatQuickQuestions,
  chatScripts,
  type ChatScript,
  type ToolCallStep,
} from '@/mock/demoMock';

type MsgStatus = 'thinking' | 'tool' | 'streaming' | 'done';

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  thinking?: string;
  toolCalls?: ToolCallStep[];
  visibleTools?: number;
  content?: string;
  typed?: number;
  status?: MsgStatus;
}

let msgId = 1;

/** 根据用户问题匹配 Mock 脚本 */
function matchScript(q: string): ChatScript {
  const entry = Object.entries(chatScripts).find(
    ([, s]) => q.includes(s.question.slice(2, 8)) || q.includes(s.question.slice(0, 6)),
  );
  if (entry) return entry[1];
  // 关键词兜底
  if (/检验|化验|结果/.test(q)) return chatScripts['检验'];
  if (/阿司匹林|处方|开药|用药/.test(q)) return chatScripts['处方'];
  if (/指南|规范|查询/.test(q)) return chatScripts['指南'];
  if (/危急值|告警|待处理/.test(q)) return chatScripts['危急值'];
  return {
    question: q,
    thinking: '正在理解您的问题，并在知识库中检索相关内容……',
    toolCalls: [
      {
        tool: 'rag_search',
        args: `{ query: "${q}", topK: 3 }`,
        result: '命中相关知识条目',
        duration: '132ms',
      },
    ],
    answer:
      '已为您处理该问题（演示数据）。在真实环境中，智能体将结合患者档案、CDS 规则与最新指南给出结构化建议。您可以尝试点击下方预设问题，查看完整的工具调用与流式回复效果。',
  };
}

export default function ChatDemoPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: msgId++,
      role: 'assistant',
      content:
        '您好，我是健澜数智医院智能体 AI 助手。您可以让我分析患者检验结果、开具处方、查询诊疗指南或查看危急值。试试下方预设问题吧。',
      status: 'done',
    },
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    document.title = '智能对话 Demo · 健澜科技';
    return () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
    };
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  const later = (fn: () => void, ms: number) => {
    const t = window.setTimeout(fn, ms);
    timersRef.current.push(t);
  };

  const runScript = (script: ChatScript) => {
    const aid = msgId++;
    // 1) 思考中
    setMessages((prev) => [
      ...prev,
      { id: aid, role: 'assistant', thinking: script.thinking, status: 'thinking' },
    ]);
    later(() => {
      // 2) 开始工具调用
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aid ? { ...m, status: 'tool', toolCalls: script.toolCalls, visibleTools: 0 } : m,
        ),
      );
      // 逐个展示工具调用
      script.toolCalls.forEach((_, idx) => {
        later(
          () => {
            setMessages((prev) =>
              prev.map((m) => (m.id === aid ? { ...m, visibleTools: idx + 1 } : m)),
            );
          },
          700 * (idx + 1),
        );
      });
      // 3) 流式输出答案
      const toolDoneAt = 700 * script.toolCalls.length + 500;
      later(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === aid ? { ...m, status: 'streaming', typed: 0 } : m)),
        );
        const answer = script.answer;
        const step = Math.max(2, Math.round(answer.length / 60));
        let cur = 0;
        const tick = () => {
          cur = Math.min(answer.length, cur + step);
          const finalize = cur >= answer.length;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aid
                ? {
                    ...m,
                    content: answer.slice(0, cur),
                    typed: cur,
                    status: finalize ? 'done' : 'streaming',
                  }
                : m,
            ),
          );
          if (!finalize) later(tick, 24);
          else setBusy(false);
        };
        tick();
      }, toolDoneAt);
    }, 900);
  };

  const send = (raw?: string) => {
    const q = (raw ?? input).trim();
    if (!q || busy) return;
    setBusy(true);
    setInput('');
    setMessages((prev) => [...prev, { id: msgId++, role: 'user', content: q, status: 'done' }]);
    later(() => runScript(matchScript(q)), 200);
  };

  return (
    <div>
      <GradientBackground variant="dark" className="pb-10 pt-28 sm:pt-32">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h1 className="m-0 text-3xl font-bold text-white sm:text-4xl">智能对话 Demo</h1>
          <p className="mt-3 text-base text-white/80">
            与数智医院智能体实时对话，观察思考、工具调用与流式回复全过程（前端 Mock 数据）
          </p>
        </div>
      </GradientBackground>

      <section className="bg-[#F5F7FA] py-10">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="overflow-hidden rounded-jl border border-[#E1E8F0] bg-white shadow-card">
            {/* 消息列表 */}
            <div ref={listRef} className="h-[520px] space-y-4 overflow-y-auto bg-[#FAFBFD] p-4">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <span
                    className={`flex h-8 w-8 flex-none items-center justify-center rounded-full text-white ${
                      m.role === 'user' ? 'bg-[#8C8C8C]' : 'bg-jl-primary'
                    }`}
                  >
                    {m.role === 'user' ? <UserOutlined /> : <RobotOutlined />}
                  </span>
                  <div className={`max-w-[80%] ${m.role === 'user' ? 'text-right' : ''}`}>
                    {/* 气泡 */}
                    <div
                      className={`inline-block rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed ${
                        m.role === 'user'
                          ? 'bg-jl-primary text-white'
                          : 'border border-[#E8ECF1] bg-white text-[#2B3A52]'
                      }`}
                    >
                      {/* 思考中 */}
                      {m.status === 'thinking' && (
                        <div className="flex items-center gap-2 text-ink-secondary">
                          <LoadingOutlined />
                          <span>{m.thinking}</span>
                        </div>
                      )}
                      {/* 工具调用卡片 */}
                      {(m.status === 'tool' || m.status === 'streaming' || m.status === 'done') &&
                        m.toolCalls &&
                        (m.visibleTools ?? 0) > 0 && (
                          <div className="mb-2 space-y-2">
                            {m.toolCalls.slice(0, m.visibleTools).map((tc, i) => (
                              <div
                                key={i}
                                className="rounded-lg border border-[#DCE9F7] bg-[#F2F8FF] p-2.5 text-xs"
                              >
                                <div className="flex items-center gap-2 font-medium text-jl-primary">
                                  <ApiOutlined />
                                  <span>工具调用：{tc.tool}</span>
                                  <Tag color="default" className="ml-auto !text-[10px]">
                                    {tc.duration}
                                  </Tag>
                                </div>
                                <div className="mt-1 text-ink-secondary">
                                  参数：<code className="text-[#0A4D8C]">{tc.args}</code>
                                </div>
                                <div className="mt-1 flex items-center gap-1 text-[#3A4B66]">
                                  <CheckCircleFilled className="text-[#52C41A]" />
                                  {tc.result}
                                </div>
                              </div>
                            ))}
                            {m.status === 'tool' && (
                              <LoadingOutlined className="mt-1 text-jl-primary" />
                            )}
                          </div>
                        )}
                      {/* 回复内容 */}
                      {m.content && (
                        <div className="whitespace-pre-wrap">
                          {m.content}
                          {m.status === 'streaming' && (
                            <span className="jl-blink ml-0.5 inline-block h-3.5 w-[7px] bg-jl-primary align-middle" />
                          )}
                        </div>
                      )}
                      {m.status === 'streaming' && !m.content && (
                        <div className="flex gap-1">
                          <span className="jl-blink h-1.5 w-1.5 rounded-full bg-[#B8C4D6]" />
                          <span
                            className="jl-blink h-1.5 w-1.5 rounded-full bg-[#B8C4D6]"
                            style={{ animationDelay: '0.2s' }}
                          />
                          <span
                            className="jl-blink h-1.5 w-1.5 rounded-full bg-[#B8C4D6]"
                            style={{ animationDelay: '0.4s' }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 快捷问题 */}
            <div className="flex flex-wrap gap-2 border-t border-[#EEF2F7] bg-white px-4 py-3">
              {chatQuickQuestions.map((q) => (
                <button
                  key={q}
                  type="button"
                  disabled={busy}
                  onClick={() => send(q)}
                  className="rounded-full border border-[#D6E4F5] bg-[#F2F8FF] px-3 py-1 text-xs text-jl-primary transition-colors hover:bg-[#E3F0FF] disabled:opacity-50"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* 输入区 */}
            <div className="flex items-end gap-3 border-t border-[#EEF2F7] bg-white p-3">
              <Input.TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="输入您的问题，例如：帮我分析患者检验结果…"
                autoSize={{ minRows: 1, maxRows: 4 }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
              />
              <Button type="primary" icon={<SendOutlined />} loading={busy} onClick={() => send()}>
                发送
              </Button>
            </div>
          </div>
          <p className="mt-3 text-center text-xs text-ink-secondary">
            本页面为纯前端演示，所有回复与工具调用均为模拟数据，不连接真实后端。
          </p>
        </div>
      </section>
    </div>
  );
}
