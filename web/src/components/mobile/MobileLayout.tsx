/**
 * 健澜科技 jlmedaios - 移动护理 PDA 端布局（M16-A）
 *
 * 独立移动布局：顶部 Header（病区切换 + 护士 + 在线/离线点）+ 内容区 + 底部大按钮 Tab。
 * 不套 PC AppLayout/SideMenu；路由前缀 /m/*，一套代码承载 PDA 浏览器 / Android / 鸿蒙 WebView。
 * 健康门禁：BFF/DB 不可用 → 红色 Alert + 水印 + 不渲染业务数据（不假数据）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import { Layout, Tag, Watermark, Alert, Spin, Select, Badge } from 'antd';
import {
  TeamOutlined,
  CheckSquareOutlined,
  SwapOutlined,
  UserOutlined,
  WifiOutlined,
  DisconnectOutlined,
} from '@ant-design/icons';
import { NavLink, Outlet } from 'react-router-dom';

import { useMobileNursingStore } from '@/store/mobileNursingStore';
import { useAuthStore } from '@/store/authStore';

const { Header, Content } = Layout;
const watermarkText = ['健澜科技', '移动护理', 'jlmedaios'];

const TABS = [
  { to: '/m/patients', label: '患者', icon: <TeamOutlined />, testid: 'm-tab-patients' },
  { to: '/m/tasks', label: '任务', icon: <CheckSquareOutlined />, testid: 'm-tab-tasks' },
  { to: '/m/handoff', label: '交班', icon: <SwapOutlined />, testid: 'm-tab-handoff' },
  { to: '/m/me', label: '我的', icon: <UserOutlined />, testid: 'm-tab-me' },
];

/** 病区切换：P0 复用当前护士科室；预留 Select 供多病区切换。 */
const DEPT_OPTIONS = [{ value: 'NW1', label: '一病区（NW1）' }];

export default function MobileLayout() {
  const { dbUp, loadingHealth, checkHealth, deptCode, setDept, error } = useMobileNursingStore();
  const user = useAuthStore((s) => s.user);
  const [online, setOnline] = useState<boolean>(
    typeof navigator === 'undefined' ? true : navigator.onLine,
  );

  useEffect(() => {
    void checkHealth();
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, [checkHealth]);

  const offline = dbUp === false;

  return (
    <Watermark content={watermarkText}>
      <Layout className="min-h-screen" style={{ maxWidth: 480, margin: '0 auto' }}>
        <Header
          className="flex items-center justify-between px-3"
          style={{ background: '#0b3d91', position: 'sticky', top: 0, zIndex: 10 }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base font-semibold text-white">移动护理</span>
            <Select
              size="small"
              value={deptCode || 'NW1'}
              data-testid="m-dept-select"
              style={{ width: 130 }}
              options={DEPT_OPTIONS}
              onChange={(v) => setDept(v)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Tag color={online ? 'green' : 'red'} data-testid="m-online-tag" icon={online ? <WifiOutlined /> : <DisconnectOutlined />}>
              {online ? '在线' : '离线'}
            </Tag>
            <Badge dot={!online} offset={[-2, 2]}>
              <span className="text-sm text-white">{user?.realName ?? '护士'}</span>
            </Badge>
          </div>
        </Header>

        <Content className="px-3 py-3" style={{ paddingBottom: 72 }}>
          <Spin spinning={loadingHealth}>
            {offline ? (
              <Alert
                data-testid="m-offline-alert"
                type="error"
                showIcon
                banner
                message="无法连接 BFF 或数据库，移动护理执行端不可用"
                description="请检查服务与数据库连接；恢复后自动重连。系统不会以缓存或假数据冒充患者、给药、体征或交班结果。离线期间床旁写操作将进入本地队列，恢复后人工核对再同步。"
                action={
                  <button type="button" className="ant-btn ant-btn-default" onClick={() => void checkHealth()}>
                    重新探活
                  </button>
                }
              />
            ) : (
              <Outlet />
            )}
          </Spin>
          {error && !offline && (
            <Alert data-testid="m-error-alert" type="error" showIcon className="mt-2" message={error} />
          )}
        </Content>

        <nav
          data-testid="m-tabbar"
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            maxWidth: 480,
            margin: '0 auto',
            display: 'flex',
            borderTop: '1px solid #e8e8e8',
            background: '#fff',
            zIndex: 20,
          }}
        >
          {TABS.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              data-testid={t.testid}
              style={({ isActive }) => ({
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '10px 0',
                fontSize: 20,
                color: isActive ? '#0b3d91' : '#8c8c8c',
                background: isActive ? '#e6f0ff' : 'transparent',
                textDecoration: 'none',
              })}
            >
              {t.icon}
              <span style={{ fontSize: 12, marginTop: 2 }}>{t.label}</span>
            </NavLink>
          ))}
        </nav>
      </Layout>
    </Watermark>
  );
}
