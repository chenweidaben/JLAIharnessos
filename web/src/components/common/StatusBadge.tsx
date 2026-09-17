/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 状态徽章：医疗场景专用颜色
 */
import { Tag } from 'antd';
import clsx from 'clsx';

import type { MedicalLevel } from '@/types/common';

const levelMap: Record<MedicalLevel, { color: string; label: string }> = {
  critical: { color: '#F5222D', label: '危急' },
  abnormal: { color: '#FA8C16', label: '异常' },
  normal: { color: '#52C41A', label: '正常' },
  pending: { color: '#1890FF', label: '待处理' },
};

interface StatusBadgeProps {
  level: MedicalLevel;
  text?: string;
  pulse?: boolean;
}

export default function StatusBadge({ level, text, pulse }: StatusBadgeProps) {
  const cfg = levelMap[level];
  return (
    <Tag className={clsx('mr-0', pulse && 'animate-pulse-slow')} color={cfg.color}>
      {text ?? cfg.label}
    </Tag>
  );
}
