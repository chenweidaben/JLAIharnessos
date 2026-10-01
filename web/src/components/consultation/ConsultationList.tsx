/**
 * 健澜科技 jlmedaios - 问诊会话列表面板（M3-K）
 *
 * 待接诊队列 / 我的会话 Tab 切换，点击打开聊天。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useState } from 'react';
import { Badge, List, Tabs, Tag, Typography } from 'antd';
import { useConsultationStore } from '../../store/consultationStore';
import type {
  ConsultationSessionView,
  ConsultationStatus,
} from '../../types/consultation';

const { Text } = Typography;

/** 简洁时间 MM-DD HH:mm */
function fmt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const STATUS_COLOR: Partial<Record<ConsultationStatus, string>> = {
  pending: 'gold',
  in_consultation: 'processing',
  completed: 'success',
  cancelled: 'default',
  timed_out: 'error',
};

function SessionItem({
  s,
  active,
  onClick,
}: {
  s: ConsultationSessionView;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <List.Item
      onClick={onClick}
      style={{
        cursor: 'pointer',
        padding: '10px 12px',
        background: active ? '#e6f4ff' : undefined,
      }}
    >
      <List.Item.Meta
        title={
          <span style={{ fontSize: 13 }}>
            <Tag color={STATUS_COLOR[s.status]} style={{ marginInlineEnd: 4 }}>
              {s.status === 'in_consultation' ? '问诊中' : s.status === 'pending' ? '待接诊' : s.status}
            </Tag>
            {s.sessionNo.slice(-6)}
          </span>
        }
        description={
          <span style={{ fontSize: 12 }}>
            <Text type="secondary">{s.department}</Text>
            {s.chiefComplaint && (
              <Text type="secondary" ellipsis>
                {' · '}
                {s.chiefComplaint}
              </Text>
            )}
            <br />
            <Text type="secondary" style={{ fontSize: 11 }}>
              {fmt(s.createdAt)}
            </Text>
          </span>
        }
      />
    </List.Item>
  );
}

export function ConsultationList() {
  const {
    pending,
    doctorSessions,
    current,
    health,
    loadPending,
    loadDoctorSessions,
    openSession,
  } = useConsultationStore();
  const [tab, setTab] = useState('pending');

  // 健康检查通过后才加载（默认保守离线，避免与 checkHealth 竞态）
  useEffect(() => {
    if (health.online) {
      loadPending();
      loadDoctorSessions();
    }
  }, [health.online, loadPending, loadDoctorSessions]);

  return (
    <Tabs
      activeKey={tab}
      onChange={setTab}
      items={[
        {
          key: 'pending',
          label: <Badge count={pending.length} size="small" offset={[6, -2]} title="待接诊">待接诊</Badge>,
          children: (
            <List
              size="small"
              dataSource={pending}
              locale={{ emptyText: '暂无待接诊' }}
              renderItem={(s) => (
                <SessionItem
                  key={s.id}
                  s={s}
                  active={current?.session.id === s.id}
                  onClick={() => openSession(s.id)}
                />
              )}
            />
          ),
        },
        {
          key: 'mine',
          label: '我的会话',
          children: (
            <List
              size="small"
              dataSource={doctorSessions}
              locale={{ emptyText: '暂无会话' }}
              renderItem={(s) => (
                <SessionItem
                  key={s.id}
                  s={s}
                  active={current?.session.id === s.id}
                  onClick={() => openSession(s.id)}
                />
              )}
            />
          ),
        },
      ]}
    />
  );
}
