/**
 * 健澜科技 jlmedaios - 质控指标导出前端页（M484-D，M484 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：导出表单（指标名/格式选择）+ CSV 预览文本框。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Select, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

export default function EmrQcMetricExportPage() {
  const [metricName, setMetricName] = useState("完整率");
  const [format, setFormat] = useState("csv");
  const [csvContent, setCsvContent] = useState("");

  const exportData = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-metric-export", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ metricName, format }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setCsvContent(data?.csvContent ?? "");
      }
    } catch {
      // graceful
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控指标导出</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
            <Input placeholder="指标名" value={metricName} onChange={(e) => setMetricName(e.target.value)} style={{ width: 160 }} />
            <Select
              value={format}
              onChange={setFormat}
              style={{ width: 120 }}
              options={[
                { value: "csv", label: "CSV" },
                { value: "excel", label: "Excel" },
              ]}
            />
            <Button type="primary" onClick={exportData} style={{ background: VI.accent }}>
              导出
            </Button>
          </div>
        </Card>
        {csvContent && (
          <Card title="CSV 预览" style={{ marginTop: 16 }}>
            <pre style={{ background: VI.bg, padding: 16, borderRadius: 4, whiteSpace: "pre-wrap" }}>{csvContent}</pre>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
