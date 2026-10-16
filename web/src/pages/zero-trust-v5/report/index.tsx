/**
 * 健澜科技 jlmedaios - 零信任与身份安全 V5 页（M261-A）
 *
 * SSO/MFA/角色权限目录社交登录离职回收/永不信任始终验证最小权限微隔离持续验证/PAM特权账号会话录像密码保险箱工单审批/设备指纹合规检查MDM越狱检测网络准入NAC/API网关OAuth2 Scope限流签名审计/按行按字段按角色动态脱敏访问审批水印/UEBA异常行为横向移动告警调查SOAR/MFA覆盖率特权账号合规越权事件回收时效事故。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import {
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Typography,
} from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  timeRange: string;
  identity: { sso: number; mfa: number; role: number; directory: number; social: number; offboard: number };
  zeroTrust: { neverTrust: number; verify: number; minPrivilege: number; microSegmentation: number; continuous: number };
  pam: { privileged: number; sessionRecording: number; vault: number; ticket: number; approval: number };
  device: { fingerprint: number; compliance: number; mdm: number; jailbreak: number; nac: number };
  api: { gateway: number; oauth2: number; scope: number; rateLimit: number; signing: number; audit: number };
  desensitization: { row: number; field: number; role: number; dynamic: number; approval: number; watermark: number };
  ueba: { behavior: number; anomalous: number; lateralMovement: number; alert: number; investigation: number; soar: number };
  metrics: { mfaCoverage: number; privilegedCompliance: number; overPrivilege: number; recycleTime: number; incident: number };
  suggestions: string[];
}

export default function ZeroTrustV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/zero-trust-v5/report");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>零信任与身份安全 V5</Title>
        <Paragraph type="secondary">SSO·MFA·角色权限·目录·社交登录·离职回收 / 永不信任·始终验证·最小权限·微隔离·持续验证 / PAM·特权账号·会话录像·密码保险箱·工单审批 / 设备指纹·合规检查·MDM·越狱检测·NAC / API 网关·OAuth2·Scope·限流·签名·审计</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="MFA 覆盖率" value={`${data.metrics.mfaCoverage}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="特权合规" value={`${data.metrics.privilegedCompliance}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="越权事件" value={data.metrics.overPrivilege} /></Card></Col>
              <Col span={6}><Card><Statistic title="安全事故" value={data.metrics.incident} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>安全明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "pam", name: "特权会话录像", value: `${data.pam.sessionRecording}%` },
                  { key: "device", name: "设备合规", value: `${data.device.compliance}%` },
                  { key: "ueba", name: "UEBA 异常检测", value: data.ueba.anomalous },
                  { key: "watermark", name: "水印覆盖", value: `${data.desensitization.watermark}%` },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "数值", dataIndex: "value", key: "value" },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
