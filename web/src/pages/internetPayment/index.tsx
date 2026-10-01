/**
 * 健澜科技 jlmedaios - 互联网在线支付工作站（M3-M）
 *
 * 角色分流：患者 → 待支付处方 + 支付单 + 电子票据；
 *           药师/管理员（internet:payment:refund / internet:invoice:view）→ 财务视图。
 * 健康门禁：BFF/DB 离线时红色 Alert + 全屏水印，业务阻断，不假成功。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useMemo, useState } from 'react';
import { Alert, Space, Watermark } from 'antd';
import { useAuthStore } from '../../store/authStore';
import { useInternetPaymentStore } from '../../store/internetPaymentStore';
import { internetPaymentApi } from '../../services/api/internetPayment';
import { PatientView } from '../../components/internetPayment/PatientView';
import { FinanceView } from '../../components/internetPayment/FinanceView';

export default function InternetPaymentWorkbench() {
  const user = useAuthStore((s) => s.user);
  const { healthOk, healthMsg, checking, checkHealth } = useInternetPaymentStore();
  const [patientId, setPatientId] = useState<string>('');
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  useEffect(() => {
    if (healthOk) {
      setProfileLoading(true);
      internetPaymentApi
        .patientProfile()
        .then((r) => setPatientId(r.patientId ?? ''))
        .catch(() => setPatientId(''))
        .finally(() => setProfileLoading(false));
    }
  }, [healthOk]);

  const role = user?.roleCodes ?? ([] as unknown as string[]);
  const isPatient = useMemo(() => (role as string[]).includes('patient'), [role]);
  const isFinance = useMemo(() => {
    const perms = user?.permissions ?? [];
    return (
      (perms as string[]).includes('internet:payment:refund') ||
      (perms as string[]).includes('internet:invoice:view')
    );
  }, [user]);

  return (
    <Watermark
      content={[
        '健澜科技 jlmedaios',
        `${user?.realName ?? ''}  ·  互联网在线支付`,
      ]}
      font={{ color: 'rgba(22,119,255,0.08)', fontSize: 13 }}
      gap={[150, 150]}
    >
      {!checking && !healthOk && (
        <Alert
          type="error"
          showIcon
          banner
          style={{ marginBottom: 12 }}
          message="后端服务或数据库不可用，在线支付业务已暂停"
          description="系统不会以缓存或假数据冒充支付与票据结果。请等待服务恢复后刷新页面。"
        />
      )}
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {!healthOk && healthMsg ? (
          <Alert type="warning" showIcon message={healthMsg} />
        ) : null}
        {isPatient ? (
          profileLoading ? (
            <Alert type="info" showIcon message="正在加载患者档案…" />
          ) : patientId ? (
            <PatientView patientId={patientId} />
          ) : (
            <Alert
              type="warning"
              showIcon
              message="当前账号尚未完成实名建档，无法查看支付与票据。请先在「互联网医院」完成就诊人实名认证。"
            />
          )
        ) : isFinance ? (
          <FinanceView />
        ) : (
          <Alert
            type="info"
            showIcon
            message="当前账号无在线支付访问权限。患者可在此支付电子处方并获取电子票据；药师/财务可在此处理支付队列与票据冲正。"
          />
        )}
      </Space>
    </Watermark>
  );
}
