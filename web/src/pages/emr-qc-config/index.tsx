/**
 * 健澜科技 jlmedaios - 病历质控系统配置前端页（M473-D，M473 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：配置表单（通过率阈值滑块/缺陷率危险阈值滑块/自动质控开关/提醒开关）+ 保存按钮。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Slider, Spin, Switch, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface QcConfig {
  passThreshold: number;
  defectDangerThreshold: number;
  autoQcEnabled: boolean;
  reminderEnabled: boolean;
}

export default function EmrQcConfigPage() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<QcConfig>({
    passThreshold: 90,
    defectDangerThreshold: 10,
    autoQcEnabled: true,
    reminderEnabled: true,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-config", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled && data?.config) setConfig(data.config);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控系统配置</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }}>
          <Spin spinning={loading}>
            <div style={{ marginBottom: 24 }}>
              <Text strong>通过率阈值：{config.passThreshold}%</Text>
              <Slider
                min={0}
                max={100}
                value={config.passThreshold}
                onChange={(v) => setConfig((c) => ({ ...c, passThreshold: v }))}
                style={{ maxWidth: 400 }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <Text strong>缺陷率危险阈值：{config.defectDangerThreshold}%</Text>
              <Slider
                min={0}
                max={100}
                value={config.defectDangerThreshold}
                onChange={(v) => setConfig((c) => ({ ...c, defectDangerThreshold: v }))}
                style={{ maxWidth: 400 }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <Text strong>自动质控：</Text>
              <Switch
                checked={config.autoQcEnabled}
                onChange={(v) => setConfig((c) => ({ ...c, autoQcEnabled: v }))}
                style={{ marginLeft: 12 }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <Text strong>提醒开关：</Text>
              <Switch
                checked={config.reminderEnabled}
                onChange={(v) => setConfig((c) => ({ ...c, reminderEnabled: v }))}
                style={{ marginLeft: 12 }}
              />
            </div>
            <Button type="primary" style={{ background: VI.accent }}>保存配置</Button>
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
