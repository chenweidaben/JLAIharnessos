/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 检验结果项：异常值高亮
 */
import clsx from 'clsx';

import type { LabResultItem } from '@/types/medical';
import StatusBadge from '@/components/common/StatusBadge';

const valueColor: Record<LabResultItem['level'], string> = {
  critical: 'text-medical-critical font-semibold',
  abnormal: 'text-medical-abnormal font-medium',
  normal: 'text-ink-primary',
  pending: 'text-medical-pending',
};

export default function LabResultRow({ item }: { item: LabResultItem }) {
  return (
    <div className="flex items-center justify-between border-b border-ink-border py-2 last:border-0">
      <div className="w-1/3">
        <div className="text-sm text-ink-primary">{item.itemName}</div>
        <div className="text-xs text-ink-secondary">参考区间 {item.refRange ?? '--'}</div>
      </div>
      <div className={clsx('w-1/3 text-right text-sm', valueColor[item.level])}>
        {item.value}
        {item.unit && <span className="ml-1 text-xs text-ink-secondary">{item.unit}</span>}
      </div>
      <div className="w-1/6 text-right">
        <StatusBadge level={item.level} pulse={item.level === 'critical'} />
      </div>
    </div>
  );
}
