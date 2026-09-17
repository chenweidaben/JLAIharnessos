/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 警报横幅：危急值 / 过敏 / 药物相互作用
 */
import { Alert } from 'antd';

import type { Alert as AlertData } from '@/types/medical';

const levelTypeMap: Record<AlertData['level'], 'error' | 'warning' | 'info'> = {
  critical: 'error',
  abnormal: 'warning',
  normal: 'info',
  pending: 'info',
};

export default function AlertBanner({ alert }: { alert: AlertData }) {
  return (
    <Alert
      className="mb-3"
      type={levelTypeMap[alert.level]}
      showIcon
      message={alert.title}
      description={alert.content}
    />
  );
}
