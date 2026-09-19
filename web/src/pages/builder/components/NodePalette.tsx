/**
 * 健澜科技杠OS - 节点面板（拖拽源）
 * Copyright (c) 2026 健澜科技.
 */

import {
  PlayCircleOutlined,
  StopOutlined,
  RobotOutlined,
  ToolOutlined,
  BookOutlined,
  BranchesOutlined,
  RetweetOutlined,
  DeploymentUnitOutlined,
  UserSwitchOutlined,
  TeamOutlined,
  FunctionOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { Typography } from 'antd';
import { NODE_TYPES } from '../constants';
import { useBuilderStore } from '../builderStore';
import type { NodeType } from '@/types/builder';

const ICONS: Record<string, React.ReactNode> = {
  PlayCircleOutlined: <PlayCircleOutlined />,
  StopOutlined: <StopOutlined />,
  RobotOutlined: <RobotOutlined />,
  ToolOutlined: <ToolOutlined />,
  BookOutlined: <BookOutlined />,
  BranchesOutlined: <BranchesOutlined />,
  RetweetOutlined: <RetweetOutlined />,
  DeploymentUnitOutlined: <DeploymentUnitOutlined />,
  UserSwitchOutlined: <UserSwitchOutlined />,
  TeamOutlined: <TeamOutlined />,
  FunctionOutlined: <FunctionOutlined />,
  ClockCircleOutlined: <ClockCircleOutlined />,
};

const GROUPS: Array<{ name: string; types: NodeType[] }> = [
  { name: '流程', types: ['start', 'end', 'delay'] },
  { name: '智能能力', types: ['llm', 'tool', 'rag', 'subagent'] },
  { name: '控制', types: ['condition', 'loop', 'parallel', 'code'] },
  { name: '人机协同', types: ['human'] },
];

export default function NodePalette() {
  const paletteType = useBuilderStore((s) => s.paletteType);
  const setPaletteType = useBuilderStore((s) => s.setPaletteType);

  const onDragStart = (event: React.DragEvent, type: NodeType) => {
    event.dataTransfer.setData('application/reactflow', type);
    event.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div style={{ padding: 12, overflowY: 'auto', height: '100%' }}>
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        节点库
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
        拖拽节点到画布；或<span style={{ color: '#0A4D8C', fontWeight: 600 }}>点击选中</span>
        一种节点后，<span style={{ color: '#0A4D8C', fontWeight: 600 }}>双击画布空白处</span>放置。
      </Typography.Paragraph>
      {GROUPS.map((g) => (
        <div key={g.name} style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: '#8a97a6', marginBottom: 6 }}>{g.name}</div>
          {NODE_TYPES.filter((n) => g.types.includes(n.type)).map((n) => {
            const active = paletteType === n.type;
            return (
              <div
                key={n.type}
                draggable
                onDragStart={(e) => onDragStart(e, n.type)}
                onClick={() => setPaletteType(active ? null : n.type)}
                title={`${n.description}（拖拽到画布，或点击选中后双击画布放置）`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '8px 10px',
                  marginBottom: 6,
                  border: `1px solid ${active ? n.color : '#e3e9f2'}`,
                  borderRadius: 8,
                  background: active ? `${n.color}14` : '#fff',
                  boxShadow: active ? `0 0 0 1px ${n.color} inset` : 'none',
                  cursor: 'grab',
                  fontSize: 13,
                  userSelect: 'none',
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.borderColor = n.color;
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.borderColor = '#e3e9f2';
                }}
              >
                <span style={{ color: n.color, fontSize: 15 }}>{ICONS[n.icon]}</span>
                <div>
                  <div style={{ fontWeight: 600, lineHeight: 1.2 }}>
                    {n.label}
                    {active && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: n.color, fontWeight: 600 }}>
                        待放置
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 11, color: '#9aa7b5', lineHeight: 1.3 }}>{n.description}</div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
