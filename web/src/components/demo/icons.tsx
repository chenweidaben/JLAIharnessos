/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 演示页图标注册表：Mock 数据中的图标名 -> antd 图标组件
 */
import {
  AlertOutlined,
  ApiOutlined,
  AuditOutlined,
  BarChartOutlined,
  EnvironmentOutlined,
  FileDoneOutlined,
  HomeOutlined,
  IdcardOutlined,
  MessageOutlined,
  SafetyCertificateOutlined,
  DashboardOutlined,
  CloudServerOutlined,
  SafetyOutlined,
  TeamOutlined,
  PhoneOutlined,
  MailOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  BulbOutlined,
  RobotOutlined,
  LockOutlined,
  ShareAltOutlined,
  LineChartOutlined,
  StarOutlined,
} from '@ant-design/icons';
import type { ComponentType, CSSProperties } from 'react';

/** AntD 图标组件通用 props（AntD5 未单独导出 AntdIconProps，此处内联最小子集） */
export type AntdIconProps = { className?: string; style?: CSSProperties; spin?: boolean };

export const demoIconMap: Record<string, ComponentType<AntdIconProps>> = {
  MessageOutlined: MessageOutlined,
  SafetyCertificateOutlined: SafetyCertificateOutlined,
  IdcardOutlined: IdcardOutlined,
  FileDoneOutlined: FileDoneOutlined,
  BarChartOutlined: BarChartOutlined,
  ApiOutlined: ApiOutlined,
  EnvironmentOutlined: EnvironmentOutlined,
  HomeOutlined: HomeOutlined,
  AlertOutlined: AlertOutlined,
  AuditOutlined: AuditOutlined,
  DashboardOutlined: DashboardOutlined,
  CloudServerOutlined: CloudServerOutlined,
  SafetyOutlined: SafetyOutlined,
  TeamOutlined: TeamOutlined,
  PhoneOutlined: PhoneOutlined,
  MailOutlined: MailOutlined,
  GlobalOutlined: GlobalOutlined,
  ClockCircleOutlined: ClockCircleOutlined,
  CheckCircleOutlined: CheckCircleOutlined,
  BulbOutlined: BulbOutlined,
  RobotOutlined: RobotOutlined,
  LockOutlined: LockOutlined,
  ShareAltOutlined: ShareAltOutlined,
  LineChartOutlined: LineChartOutlined,
  StarOutlined: StarOutlined,
};

export function DemoIcon({ name, ...rest }: { name: string } & AntdIconProps) {
  const Icon = demoIconMap[name] ?? StarOutlined;
  return <Icon {...rest} />;
}
