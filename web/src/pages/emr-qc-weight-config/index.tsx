/**
 * 健澜科技 jlmedaios - 病历质控权重配置前端页（M479-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：权重滑块（完整性/时效性/规范性各 0-100）+ 总和实时显示 + 验证结果（绿√红✗）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, Slider, Spin, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

export default function EmrQcWeightConfigPage() {
  const [weights, setWeights] = useState({ 完整性: 40, 时效性: 30, 规范性: 30 });
  const [loading, setLoading] = useState(false);
  const [valid, setValid] = useState<boolean | null>(null);

  const sum = Object.values(weights).reduce((a, b) => a + b, 0);

  const save = async () => {
    setLoading(true);
    try {
      const items = Object.entries(weights).map(([dimension, weight]) => ({ dimension, weight }));
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-weight-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ items }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setValid(data?.validation?.valid ?? null);
        message.success("权重配置已保存");
      }
    } catch {
      message.error("保存失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控权重配置</Title>
        <Spin spinning={loading}>
          <Card headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
            {Object.entries(weights).map(([dim, val]) => (
              <div key={dim} style={{ marginBottom: 16 }}>
                <Text strong>{dim}：</Text>
                <Text style={{ marginLeft: 8, color: VI.accent }}>{val}%</Text>
                <Slider
                  min={0}
                  max={100}
                  value={val}
                  onChange={(v) => setWeights((prev) => ({ ...prev, [dim]: v }))}
                  style={{ marginTop: 8 }}
                />
              </div>
            ))}
            <div style={{ marginTop: 16 }}>
              <Text strong>总和：</Text>
              <Text style={{ marginLeft: 8, color: sum === 100 ? "#52c41a" : "#f5222d", fontSize: 16 }}>
                {sum}%
              </Text>
            </div>
            <Button type="primary" onClick={save} style={{ background: VI.accent, marginTop: 16 }}>
              保存配置
            </Button>
          </Card>
          {valid !== null && (
            <Card title="验证结果" headStyle={{ background: VI.mid, color: "#fff" }}>
              {valid ? (
                <Tag color="green" style={{ fontSize: 14, padding: 8 }}>√ 权重配置有效</Tag>
              ) : (
                <Tag color="red" style={{ fontSize: 14, padding: 8 }}>✗ 权重和不等于 100</Tag>
              )}
            </Card>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
