/**
 * 健澜科技 jlmedaios - 互联网处方配送工作站（M3-N）
 *
 * 角色分流：患者 → 我的配送单（自取取货码 / 快递物流）；
 *           药师/管理员（internet:delivery:fulfill）→ 药房履约面板。
 * 健康门禁：BFF/DB 离线时红色 Alert + 全屏水印，业务阻断，不假成功。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useMemo } from 'react';
import { Alert, Space, Watermark } from 'antd';
import { useAuthStore } from '../../store/authStore';
import { useInternetDeliveryStore } from '../../store/internetDeliveryStore';
import { MyDeliveries } from '../../components/internetDelivery/MyDeliveries';
import { PharmacyPanel } from '../../components/internetDelivery/PharmacyPanel';

export default function InternetDeliveryWorkbench() {
  const user = useAuthStore((s) => s.user);
  const { healthOk, healthMsg, checking, checkHealth } = useInternetDeliveryStore();

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  const role = user?.roleCodes ?? ([] as unknown as string[]);
  const isPatient = useMemo(() => (role as string[]).includes('patient'), [role]);
  const isPharmacy = useMemo(() => {
    const perms = user?.permissions ?? [];
    return (perms as string[]).includes('internet:delivery:fulfill');
  }, [user]);

  return (
    <Watermark
      content={['健澜科技 jlmedaios', `${user?.realName ?? ''}  ·  处方配送履约`]}
      font={{ color: 'rgba(22,119,255,0.08)', fontSize: 13 }}
      gap={[150, 150]}
    >
      {!checking && !healthOk && (
        <Alert
          type="error"
          showIcon
          banner
          style={{ marginBottom: 12 }}
          message="后端服务或数据库不可用，配送业务已暂停"
          description="系统不会以缓存或假数据冒充配送履约结果。请等待服务恢复后刷新页面。"
        />
      )}
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {!healthOk && healthMsg ? (
          <Alert type="warning" showIcon message={healthMsg} />
        ) : null}
        {isPatient ? (
          <MyDeliveries />
        ) : isPharmacy ? (
          <PharmacyPanel />
        ) : (
          <Alert
            type="info"
            showIcon
            message="当前账号无配送访问权限。患者可在此查看处方配送进度与自取取货码；药师可在此创建配送单并推进履约。"
          />
        )}
      </Space>
    </Watermark>
  );
}
