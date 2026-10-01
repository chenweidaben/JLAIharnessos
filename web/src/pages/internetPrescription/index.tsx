/**
 * 健澜科技 jlmedaios - 互联网电子处方工作站（M3-L）
 *
 * 角色分流：医生 → 开方（需选择进行中会话）；药师 → 审方队列。
 * 健康门禁：BFF/DB 离线时红色 Alert + 全屏水印，业务阻断，不假成功。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect, useMemo } from 'react';
import { Alert, Select, Space, Watermark } from 'antd';
import { useAuthStore } from '../../store/authStore';
import { useConsultationStore } from '../../store/consultationStore';
import { useInternetPrescriptionStore } from '../../store/internetPrescriptionStore';
import { AuditQueue } from '../../components/internetPrescription/AuditQueue';
import { PrescribePanel } from '../../components/internetPrescription/PrescribePanel';
import type { ConsultationSessionView } from '../../types/consultation';

export default function InternetPrescriptionWorkbench() {
  const user = useAuthStore((s) => s.user);
  const { health, healthChecking, checkHealth } = useInternetPrescriptionStore();
  const {
    doctorSessions,
    loadDoctorSessions,
    openSession,
    current,
  } = useConsultationStore();

  const isDoctor = useMemo(() => {
    const codes = user?.roleCodes ?? [];
    return ['chief_physician', 'associate_chief', 'attending', 'resident', 'fellow'].some(
      (c) => (codes as string[]).includes(c),
    );
  }, [user]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  useEffect(() => {
    if (health.online && isDoctor) loadDoctorSessions('in_consultation');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [health.online, isDoctor]);

  // 进行中的会话作为开方候选
  const activeSessions = useMemo(
    () => doctorSessions.filter((s) => s.status === 'in_consultation'),
    [doctorSessions],
  );

  const selectedSession: ConsultationSessionView | undefined =
    activeSessions.find((s) => s.id === current?.session.id) ?? activeSessions[0];

  return (
    <Watermark
      content={[
        '健澜科技 jlmedaios',
        `${user?.realName ?? ''}  ·  互联网电子处方`,
      ]}
      font={{ color: 'rgba(22,119,255,0.08)', fontSize: 13 }}
      gap={[150, 150]}
    >
      {!healthChecking && !health.online && (
        <Alert
          type="error"
          showIcon
          banner
          style={{ marginBottom: 12 }}
          message="后端服务或数据库不可用，电子处方业务已暂停"
          description="系统不会以缓存或假数据冒充处方结果。请等待服务恢复后刷新页面。"
        />
      )}
      {isDoctor ? (
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="请先选择进行中的问诊会话，再开具电子处方；处方提交后由药师独立审方。"
          />
          <Select
            style={{ width: 420 }}
            placeholder="选择进行中的问诊会话"
            value={selectedSession?.id}
            onChange={(id) => openSession(id)}
            options={activeSessions.map((s) => ({
              value: s.id,
              label: `#${s.id.slice(0, 8)} · ${s.chiefComplaint ?? ''}`,
            }))}
          />
          {selectedSession ? (
            <PrescribePanel
              key={selectedSession.id}
              sessionId={selectedSession.id}
              patientName={selectedSession.patientId}
            />
          ) : (
            <Alert
              type="warning"
              showIcon
              message="暂无进行中的问诊会话。请先在「互联网问诊」中接诊并开始会话后，再来开具处方。"
            />
          )}
        </Space>
      ) : (
        <AuditQueue />
      )}
    </Watermark>
  );
}
