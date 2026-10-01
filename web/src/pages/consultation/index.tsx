/**
 * 健澜科技 jlmedaios - 互联网问诊工作站页面（M3-K）
 *
 * 医生 Web 端：左侧会话列表（待接诊/我的会话），右侧聊天面板。
 * 健康门禁：BFF/DB 离线时红色 Alert + 全屏水印，业务阻断，不假成功。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { useEffect } from 'react';
import { Alert, Card, Col, Row, Spin, Watermark } from 'antd';
import { ConsultationList } from '../../components/consultation/ConsultationList';
import { ConsultationChat } from '../../components/consultation/ConsultationChat';
import { useConsultationStore } from '../../store/consultationStore';
import { useAuthStore } from '../../store/authStore';

export default function ConsultationWorkbench() {
  const { health, healthChecking, loading, checkHealth } = useConsultationStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return (
    <Watermark
      content={[
        '健澜科技 jlmedaios',
        `${user?.realName ?? '医生'} · 互联网问诊`,
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
          message="后端服务或数据库不可用，问诊业务已暂停"
          description="系统不会以缓存或假数据冒充问诊结果。请等待服务恢复后刷新页面。"
        />
      )}

      <Spin spinning={loading || healthChecking} tip="加载中...">
        <Row gutter={12} style={{ minHeight: 'calc(100vh - 120px)' }}>
          <Col xs={24} md={8} lg={7}>
            <Card
              size="small"
              styles={{ body: { height: 'calc(100vh - 150px)', overflowY: 'auto' } }}
            >
              <ConsultationList />
            </Card>
          </Col>
          <Col xs={24} md={16} lg={17}>
            <Card
              size="small"
              styles={{ body: { height: 'calc(100vh - 150px)' } }}
            >
              <ConsultationChat />
            </Card>
          </Col>
        </Row>
      </Spin>
    </Watermark>
  );
}
