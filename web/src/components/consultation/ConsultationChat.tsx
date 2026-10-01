/**
 * 健澜科技 jlmedaios - 问诊聊天面板（M3-K）
 *
 * 消息气泡（患者左、医生右、系统居中）+ 接诊/回复/结束操作。
 * 安全门禁：仅问诊中可输入；待接诊先接诊；终态仅展示。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useRef } from 'react';
import { Alert, Button, Empty, Input, Space, Tag, Typography } from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useConsultationStore } from '../../store/consultationStore';
import type { ConsultationStatus } from '../../types/consultation';

const { Text, Paragraph } = Typography;

const STATUS_META: Record<
  ConsultationStatus,
  { color: string; text: string }
> = {
  pending: { color: 'gold', text: '待接诊' },
  in_consultation: { color: 'processing', text: '问诊中' },
  completed: { color: 'success', text: '已结束' },
  cancelled: { color: 'default', text: '已取消' },
  timed_out: { color: 'error', text: '已超时' },
};

/** 时间格式化 HH:mm */
function fmtTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function ConsultationChat() {
  const {
    current,
    input,
    setInput,
    sending,
    accept,
    send,
    complete,
  } = useConsultationStore();
  const bottomRef = useRef<HTMLDivElement>(null);

  // 新消息自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [current?.messages.length]);

  if (!current) {
    return (
      <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
        <Empty description="请选择左侧会话" />
      </div>
    );
  }

  const { session, messages } = current;
  const meta = STATUS_META[session.status];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* 会话信息 */}
      <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 12, marginBottom: 12 }}>
        <Space wrap size={8}>
          <Tag color={meta.color} icon={<ClockCircleOutlined />}>
            {meta.text}
          </Tag>
          <Text strong>{session.sessionNo}</Text>
          <Text type="secondary">{session.department}</Text>
        </Space>
        {session.chiefComplaint && (
          <Paragraph type="secondary" style={{ margin: '6px 0 0' }}>
            主诉：{session.chiefComplaint}
          </Paragraph>
        )}
      </div>

      {/* 消息区 */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: 8 }}>
        {messages.map((m) => {
          if (m.senderType === 'system') {
            return (
              <div key={m.id} style={{ textAlign: 'center', margin: '12px 0' }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {m.content}
                </Text>
              </div>
            );
          }
          const isDoctor = m.senderType === 'doctor';
          return (
            <div
              key={m.id}
              style={{
                display: 'flex',
                justifyContent: isDoctor ? 'flex-end' : 'flex-start',
                marginBottom: 12,
              }}
            >
              <div style={{ maxWidth: '70%' }}>
                <div
                  style={{
                    background: isDoctor ? '#1677ff' : '#f5f5f5',
                    color: isDoctor ? '#fff' : 'rgba(0,0,0,0.88)',
                    padding: '8px 12px',
                    borderRadius: 8,
                    wordBreak: 'break-word',
                  }}
                >
                  {m.content}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'rgba(0,0,0,0.45)',
                    marginTop: 2,
                    textAlign: isDoctor ? 'right' : 'left',
                  }}
                >
                  {fmtTime(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 操作区 */}
      <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 12, marginTop: 8 }}>
        {session.status === 'pending' && (
          <Button
            type="primary"
            block
            loading={sending}
            icon={<CheckCircleOutlined />}
            onClick={() => accept(session.id)}
          >
            接诊
          </Button>
        )}
        {session.status === 'in_consultation' && (
          <Space.Compact style={{ width: '100%' }}>
            <Input
              placeholder="输入回复内容，回车发送"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onPressEnter={() => send()}
              disabled={sending}
            />
            <Button type="primary" loading={sending} onClick={() => send()}>
              发送
            </Button>
          </Space.Compact>
        )}
        {session.status === 'in_consultation' && (
          <Button
            block
            style={{ marginTop: 8 }}
            loading={sending}
            onClick={() => complete(session.id)}
          >
            结束问诊
          </Button>
        )}
        {session.status === 'completed' && (
          <Alert type="success" showIcon message="本次问诊已结束" />
        )}
        {session.status === 'cancelled' && (
          <Alert
            type="warning"
            showIcon
            message={`患者已取消${session.cancelReason ? `：${session.cancelReason}` : ''}`}
          />
        )}
        {session.status === 'timed_out' && (
          <Alert type="error" showIcon message="会话已超时" />
        )}
      </div>
    </div>
  );
}
