/**
 * 健澜科技 jlmedaios - 质控数据导出 PDF 前端页（M497-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：PDF 导出配置表单（标题/纸张大小）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Select, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ExportConfig {
  title: string;
  pageSize: string;
}

export default function EmrQcExportPdfPage() {
  const [config, setConfig] = useState<ExportConfig | null>(null);
  const [page, setPage] = useState("");
  const [title, setTitle] = useState("质控报告");
  const [pageSize, setPageSize] = useState("A4");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-export-pdf", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setConfig(data?.data?.config ?? null);
          setPage(data?.data?.page ?? "");
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
        <Title level={3} style={{ color: VI.deep }}>质控数据导出 PDF</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="导出配置">
          <Text style={{ marginRight: 8 }}>标题：</Text>
          <Input
            style={{ width: 300 }}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div style={{ marginTop: 16 }}>
            <Text style={{ marginRight: 8 }}>纸张大小：</Text>
            <Select
              value={pageSize}
              style={{ width: 120 }}
              onChange={(v) => setPageSize(v)}
              options={[
                { value: "A4", label: "A4" },
                { value: "A3", label: "A3" },
                { value: "Letter", label: "Letter" },
              ]}
            />
          </div>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }}>
            生成 PDF
          </Button>
        </Card>
        {config && (
          <Card style={{ marginTop: 16 }} title="PDF 预览">
            <Text strong>{config.title}</Text>
            <br />
            <Text type="secondary">纸张：{config.pageSize}</Text>
            <pre style={{ marginTop: 16, background: VI.bg, padding: 16, borderRadius: 4 }}>
              {page}
            </pre>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
