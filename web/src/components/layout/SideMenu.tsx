/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 侧边栏菜单：导航 + 菜单级权限过滤（RBAC）
 *
 * 医疗合规：菜单仅展示当前登录角色有权访问的功能，遵循最小权限原则；
 * 路由级仍由 RequirePermission 二次拦截，菜单过滤只负责“不展示无权限入口”，
 * 不能替代路由守卫（用户仍可能直接输入 URL）。
 */
import { useMemo } from 'react';
import type { ReactNode } from 'react';
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
  ThunderboltOutlined,
  SolutionOutlined,
  ShopOutlined,
  AuditOutlined,
  AudioOutlined,
  FolderOpenOutlined,
  ExperimentOutlined,
  IdcardOutlined,
  DatabaseOutlined,
  MoneyCollectOutlined,
  CreditCardOutlined,
  CalendarOutlined,
  GlobalOutlined,
  MessageOutlined,
  CarOutlined,
  FileSearchOutlined,
  SmileOutlined,
  CustomerServiceOutlined,
  SwapOutlined,
  BookOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/store/authStore';

type AntdMenuItem = Required<MenuProps>['items'][number];

/** 内部导航项：perm 为可见所需权限码，数组表示“满足其一即可”（OR） */
interface NavItem {
  key: string;
  icon?: ReactNode;
  label: string;
  perm?: string | string[];
  children?: NavItem[];
}

const navItems: NavItem[] = [
  { key: '/dashboard', icon: <DashboardOutlined />, label: '工作台', perm: 'dashboard:view' },
  { key: '/patients', icon: <TeamOutlined />, label: '患者管理', perm: 'patient:view' },
  {
    key: '/imaging/ai/report',
    icon: <RobotOutlined />,
    label: 'AI 辅诊',
    perm: 'imaging:view',
  },
  { key: '/outpatient', icon: <ScheduleOutlined />, label: '门诊问诊', perm: 'emr:view' },
  {
    key: '/ward',
    icon: <MedicineBoxOutlined />,
    label: '住院查房',
    // 医生（病历/医嘱）与护士（急诊护理权限作为临床护理标识）均需进入
    perm: ['emr:view', 'order:view', 'emg:view'],
  },
  { key: '/agent', icon: <RobotOutlined />, label: 'AI 问诊', perm: 'ai:chat:use' },
  {
    key: '/builder/market',
    icon: <BuildOutlined />,
    label: '智能体工厂',
    perm: ['ai:chat:use', 'system:config'],
  },
  {
    key: '/agent-runtime',
    icon: <ThunderboltOutlined />,
    label: '智能体运行台',
    perm: ['ai:chat:use', 'system:config'],
  },
  {
    key: '/human-tasks',
    icon: <SolutionOutlined />,
    label: '人工工单中心',
    perm: ['ai:chat:use', 'system:config'],
  },
  { key: '/emergency', icon: <HeartOutlined />, label: '急诊分诊', perm: 'emg:view' },
  { key: '/pharmacy', icon: <ShopOutlined />, label: '药房发药', perm: 'pharmacy:view' },
  { key: '/medical-qc', icon: <AuditOutlined />, label: '病历质控', perm: 'medical_record:read' },
  { key: '/voice-medical', icon: <AudioOutlined />, label: '语音病历', perm: 'medical_record:read' },
  { key: '/front-page', icon: <FolderOpenOutlined />, label: '病案首页', perm: 'front_page:read' },
  { key: '/research', icon: <ExperimentOutlined />, label: '科研队列', perm: 'research:read' },
  { key: '/empi', icon: <IdcardOutlined />, label: '患者主索引', perm: 'empi:read' },
  { key: '/data-warehouse', icon: <DatabaseOutlined />, label: '数据湖仓', perm: 'data_warehouse:read' },
  { key: '/data-governance', icon: <SafetyCertificateOutlined />, label: '数据治理', perm: 'data_governance:read' },
  { key: '/billing', icon: <MoneyCollectOutlined />, label: '收费结算', perm: 'billing:read' },
{ key: '/appt', icon: <CalendarOutlined />, label: '预约随访', perm: 'appt:view' },
  { key: '/internet-hospital', icon: <GlobalOutlined />, label: '互联网医院',
    perm: ['internet:practitioner:audit', 'internet:consultation:audit'] },
  { key: '/consultation', icon: <MessageOutlined />, label: '图文问诊', perm: 'internet:consultation' },
  { key: '/internet-prescription', icon: <MedicineBoxOutlined />, label: '电子处方',
    perm: ['internet:prescription', 'internet:prescription:audit', 'internet:prescription:view'] },
  { key: '/internet-payment', icon: <CreditCardOutlined />, label: '在线支付·票据', perm: 'internet:payment:refund' },
  { key: '/internet-delivery', icon: <CarOutlined />, label: '处方配送',
    perm: ['internet:delivery:fulfill', 'internet:delivery:create', 'internet:delivery:view'] },
  { key: '/internet-reports', icon: <FileSearchOutlined />, label: '在线报告', perm: 'internet:report:view' },
  { key: '/satisfaction', icon: <SmileOutlined />, label: '满意度评价', perm: 'satisfaction:view' },
  { key: '/smart-triage', icon: <MedicineBoxOutlined />, label: '智能导诊', perm: 'triage:use' },
  { key: '/digital-companion', icon: <CustomerServiceOutlined />, label: '数字陪诊', perm: 'delegation:view' },
  { key: '/referral', icon: <SwapOutlined />, label: '双向转诊', perm: 'referral:view' },
  { key: '/knowledge-base', icon: <BookOutlined />, label: '知识库', perm: 'knowledge:read' },
  { key: '/quality', icon: <SafetyCertificateOutlined />, label: '质量管理', perm: 'qc:view' },
  {
    key: 'grp-operation',
    icon: <ApartmentOutlined />,
    label: '科室运营',
    children: [
      { key: '/operation', label: '运营概览', perm: 'ops:view' },
      { key: '/operation/analysis', label: '运营分析', perm: 'ops:view' },
      { key: '/operation/drg', label: 'DRG/DIP 分析', perm: 'ops:view' },
      { key: '/operation/quality', label: '质量指标', perm: 'ops:view' },
      { key: '/operation/staff', label: '人员管理', perm: 'ops:view' },
      { key: '/operation/equipment', label: '设备物资', perm: 'ops:view' },
    ],
  },
  { key: '/alerts', icon: <AlertOutlined />, label: '告警中心', perm: 'patient:view' },
  {
    key: 'grp-system',
    icon: <SettingOutlined />,
    label: '系统管理',
    children: [
      { key: '/system/config', label: '系统配置', perm: 'system:config' },
      { key: '/system/dict', label: '字典管理', perm: 'system:config' },
      { key: '/system/organization', label: '机构管理', perm: 'system:config' },
      { key: '/system/knowledge', label: '知识库管理', perm: 'system:config' },
      { key: '/system/cds-rules', label: 'CDS规则管理', perm: 'system:config' },
      { key: '/system/tools', label: '工具管理', perm: 'system:config' },
      { key: '/system/agents', label: 'Agent管理', perm: 'system:config' },
      { key: '/system/integration', label: '集成管理', perm: 'system:config' },
      { key: '/system/notifications', label: '消息通知', perm: 'system:config' },
      { key: '/system/monitor', label: '系统监控', perm: 'system:config' },
      { key: '/system/users', label: '用户管理', perm: 'system:user:view' },
      { key: '/system/roles', label: '角色管理', perm: 'system:role:view' },
      { key: '/system/permissions', label: '权限管理', perm: 'system:perm:manage' },
      { key: '/system/audit-logs', label: '操作审计', perm: 'system:audit:view' },
      { key: '/system/login-logs', label: '登录日志', perm: 'system:loginlog:view' },
    ],
  },
];

function canSee(perm: string | string[] | undefined, has: (code: string) => boolean): boolean {
  if (!perm) return true;
  const codes = Array.isArray(perm) ? perm : [perm];
  return codes.some(has);
}

/** 递归过滤：叶子按权限过滤；分组在全部子项被隐藏后整体隐藏 */
function filterNav(items: NavItem[], has: (code: string) => boolean): NavItem[] {
  return items
    .map((it) => {
      if (it.children) {
        const children = filterNav(it.children, has);
        return children.length > 0 ? { ...it, children } : null;
      }
      return canSee(it.perm, has) ? it : null;
    })
    .filter((it): it is NavItem => it !== null);
}

function toAntd(items: NavItem[]): AntdMenuItem[] {
  return items.map((it) => {
    if (it.children) {
      return { key: it.key, icon: it.icon, label: it.label, children: toAntd(it.children) };
    }
    return { key: it.key, icon: it.icon, label: it.label };
  });
}

export default function SideMenu() {
  const navigate = useNavigate();
  const location = useLocation();
  const hasPermission = useAuthStore((s) => s.hasPermission);

  const menuItems = useMemo(() => toAntd(filterNav(navItems, hasPermission)), [hasPermission]);

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
      defaultOpenKeys={['grp-system', 'grp-operation']}
      items={menuItems}
      onClick={({ key }) => navigate(key)}
      style={{ background: 'transparent', border: 'none' }}
    />
  );
}
