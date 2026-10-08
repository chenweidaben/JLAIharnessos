/**
 * 健澜科技 jlmedaios - 移动护理"我的"（M16-A）
 * 护士身份 / 健康状态 / 离线队列待同步数 / 退出登录。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { useEffect, useState } from 'react';
import { Card, Button, Descriptions, Tag, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';

import { useAuthStore } from '@/store/authStore';
import { useMobileNursingStore } from '@/store/mobileNursingStore';
import { offlineQueue } from '@/pwa/offlineQueue';

export default function MobileMe() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { dbUp } = useMobileNursingStore();
  const [pending, setPending] = useState<number | null>(null);

  useEffect(() => {
    offlineQueue
      .pending()
      .then((items) => setPending(items.length))
      .catch(() => setPending(0));
  }, []);

  const onLogout = () => {
    logout();
    navigate('/m/login', { replace: true });
  };

  return (
    <Card size="small" title="我的">
      <Descriptions column={1} size="small">
        <Descriptions.Item label="护士">{user?.realName ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="工号">{user?.username ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="科室">{user?.deptName ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="系统状态">
          <Tag color={dbUp ? 'green' : 'red'} data-testid="m-me-health">
            {dbUp ? 'BFF/DB 正常' : '不可用'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="离线待同步">
          <span data-testid="m-me-pending">{pending == null ? '—' : pending}</span> 条
        </Descriptions.Item>
      </Descriptions>
      {pending != null && pending > 0 && (
        <Alert
          data-testid="m-me-offline-warn"
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message={`有 ${pending} 条离线写操作待同步；医嘱执行类冲突将人工确认，不自动覆盖。`}
        />
      )}
      <Button data-testid="m-logout-btn" block danger onClick={onLogout}>
        退出登录
      </Button>
    </Card>
  );
}
