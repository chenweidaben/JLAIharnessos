/**
 * 健澜科技 jlmedaios - 质控数据导出 CSV 前端页（M497-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：CSV 导出配置表单（文件名/分隔符）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Select, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ExportConfig {
  filename: string;
  delimiter: string;
}

export default function EmrQcExportCsvPage() {
  const [config, setConfig] = useState<ExportConfig | null>(null);
  const [sampleRow, setSampleRow] = useState("");
  const [filename, setFilename] = useState("质控数据.csv");
  const [delimiter, setDelimiter] = useState(",");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-export-csv", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setConfig(data?.data?.config ?? null);
          setSampleRow(data?.data?.sampleRow ?? "");
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控数据导出 CSV</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="导出配置">
          <Text style={{ marginRight: 8 }}>文件名：</Text>
          <Input
            style={{ width: 300 }}
            value={filename}
            onChange={(e) => setFilename(e.target.value)}
          />
          <div style={{ marginTop: 16 }}>
            <Text style={{ marginRight: 8 }}>分隔符：</Text>
            <Select
              value={delimiter}
              style={{ width: 120 }}
              onChange={(v) => setDelimiter(v)}
              options={[
                { value: ",", label: "逗号 (,)" },
                { value: ";", label: "分号 (;)" },
                { value: "\t", label: "制表符 (\\t)" },
              ]}
            />
          </div>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }}>
            生成 CSV
          </Button>
        </Card>
        {config && (
          <Card style={{ marginTop: 16 }} title="CSV 预览">
            <Text strong>文件名：{config.filename}</Text>
            <br />
            <Text type="secondary">分隔符：{config.delimiter === "\t" ? "制表符" : config.delimiter}</Text>
            <pre style={{ marginTop: 16, background: VI.bg, padding: 16, borderRadius: 4 }}>
              {sampleRow}
            </pre>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
