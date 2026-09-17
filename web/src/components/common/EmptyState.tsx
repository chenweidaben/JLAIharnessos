/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 空状态
 */
import { Empty } from 'antd';

interface EmptyStateProps {
  description?: string;
}

export default function EmptyState({ description = '暂无数据' }: EmptyStateProps) {
  return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={description} />;
}
