/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 侧边栏菜单：导航
 */
import { useMemo } from 'react';
import { Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  RobotOutlined,
  AlertOutlined,
  HeartOutlined,
  SafetyCertificateOutlined,
  ApartmentOutlined,
  SettingOutlined,
  ScheduleOutlined,
  MedicineBoxOutlined,
  BuildOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';

type MenuItem = Required<MenuProps>['items'][number];

const menuItems: MenuItem[] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '工作台' },
  { key: '/patients', icon: <TeamOutlined />, label: '患者管理' },
  { key: '/outpatient', icon: <ScheduleOutlined />, label: '门诊问诊' },
  { key: '/ward', icon: <MedicineBoxOutlined />, label: '住院查房' },
  { key: '/agent', icon: <RobotOutlined />, label: 'AI 问诊' },
  { key: '/builder/market', icon: <BuildOutlined />, label: '智能体工厂' },
  { key: '/emergency', icon: <HeartOutlined />, label: '急诊分诊' },
  { key: '/quality', icon: <SafetyCertificateOutlined />, label: '质量管理' },
  {
    key: 'grp-operation',
    icon: <ApartmentOutlined />,
    label: '科室运营',
    children: [
      { key: '/operation', label: '运营概览' },
      { key: '/operation/analysis', label: '运营分析' },
      { key: '/operation/drg', label: 'DRG/DIP 分析' },
      { key: '/operation/quality', label: '质量指标' },
      { key: '/operation/staff', label: '人员管理' },
      { key: '/operation/equipment', label: '设备物资' },
    ],
  },
  { key: '/alerts', icon: <AlertOutlined />, label: '告警中心' },
  {
    key: 'grp-system',
    icon: <SettingOutlined />,
    label: '系统管理',
    children: [
      { key: '/system/config', label: '系统配置' },
      { key: '/system/dict', label: '字典管理' },
      { key: '/system/organization', label: '机构管理' },
      { key: '/system/knowledge', label: '知识库管理' },
      { key: '/system/cds-rules', label: 'CDS规则管理' },
      { key: '/system/tools', label: '工具管理' },
      { key: '/system/agents', label: 'Agent管理' },
      { key: '/system/integration', label: '集成管理' },
      { key: '/system/notifications', label: '消息通知' },
      { key: '/system/monitor', label: '系统监控' },
    ],
  },
];

export default function SideMenu() {
  const navigate = useNavigate();
  const location = useLocation();

  const selectedKey = useMemo(() => {
    if (location.pathname.startsWith('/patients')) return '/patients';
    if (location.pathname.startsWith('/outpatient')) return '/outpatient';
    if (location.pathname.startsWith('/ward')) return '/ward';
    if (location.pathname.startsWith('/emergency')) return '/emergency';
    if (location.pathname.startsWith('/quality')) return '/quality';
    if (location.pathname.startsWith('/operation')) {
      // 子菜单路由直接选中对应 key；未命中子路由时落到概览
      if (location.pathname === '/operation') return '/operation';
      return location.pathname;
    }
    if (location.pathname.startsWith('/system')) return location.pathname;
    return location.pathname;
  }, [location.pathname]);

  return (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[selectedKey]}
      items={menuItems}
      onClick={({ key }) => navigate(key)}
      style={{ background: 'transparent', border: 'none' }}
    />
  );
}
