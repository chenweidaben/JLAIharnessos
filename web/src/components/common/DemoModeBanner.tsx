/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 演示模式水印横幅：仅在 VITE_DEMO_MODE=1 时渲染。
 * 醒目提示“演示模式 - 数据不持久化”，避免与真实业务数据混淆。
 */
import { Alert } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import { isDemoMode } from '@/config';

export default function DemoModeBanner() {
  if (!isDemoMode) return null;
  return (
    <Alert
      type="warning"
      showIcon
      icon={<ExperimentOutlined />}
      message="演示模式 - 数据不持久化"
      description="当前连接本地 Mock 数据，所有操作不会写入真实业务库；如需对接 BFF，请将 VITE_DEMO_MODE 置为 0。"
      style={{ marginBottom: 12, fontWeight: 500 }}
    />
  );
}
