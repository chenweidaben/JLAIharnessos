/**
 * 健澜科技 jlmedaios - 质控指标计算前端页（M483-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：指标计算表单（指标名/分子/分母）+ 计算结果大数字。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Statistic, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

export default function EmrQcMetricCalcPage() {
  const [name, setName] = useState("完整率");
  const [numerator, setNumerator] = useState("950");
  const [denominator, setDenominator] = useState("1000");
  const [result, setResult] = useState<{ name: string; value: number } | null>(null);

  const calc = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-metric-calc", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({
          name,
          numerator: Number(numerator),
          denominator: Number(denominator),
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.result ?? null);
        message.success("计算完成");
      }
    } catch {
      message.error("计算失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控指标计算</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <Input placeholder="指标名" value={name} onChange={(e) => setName(e.target.value)} style={{ width: 160 }} />
            <Input placeholder="分子" value={numerator} onChange={(e) => setNumerator(e.target.value)} style={{ width: 120 }} />
            <Input placeholder="分母" value={denominator} onChange={(e) => setDenominator(e.target.value)} style={{ width: 120 }} />
            <Button type="primary" onClick={calc} style={{ background: VI.accent }}>
              计算
            </Button>
          </div>
        </Card>
        {result && (
          <Card style={{ marginTop: 16 }}>
            <Statistic title={result.name} value={result.value} precision={1} suffix="%" />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
