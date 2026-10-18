/**
 * 健澜科技 jlmedaios - 病历结构化数据导出前端页（M532-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历结构化数据导出（病历类型/导出格式/记录数/导出数/文件大小KB）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Select, Statistic, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface StructExport {
  recordType: string;
  format: string;
}

interface ExportResult {
  exportedCount: number;
  fileSizeKB: number;
}

interface ExportReport {
  exportedCount: number;
  fileSizeKB: number;
}

export default function EmrStructExportPage() {
  const [exp, setExp] = useState<StructExport | null>(null);
  const [recordCount, setRecordCount] = useState(100);
  const [format, setFormat] = useState<"JSON" | "CSV" | "Excel">("JSON");
  const [result, setResult] = useState<ExportResult | null>(null);
  const [report, setReport] = useState<ExportReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchExp = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-struct-export", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setExp(data?.data ?? null);
        }
      } catch {
        message.error("加载导出基础数据失败");
      }
    };
    void fetchExp();
  }, []);

  const doExport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-struct-export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ recordCount, format }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("导出完成");
      } else {
        message.error("导出失败");
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历结构化数据导出</Title>
        {exp && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历类型：</Text><Text style={{ marginRight: 24 }}>{exp.recordType}</Text>
              <Text strong>导出格式：</Text><Text>{exp.format}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>记录数：</Text>
              <Input
                type="number"
                value={recordCount}
                onChange={(e) => setRecordCount(Number(e.target.value))}
                style={{ width: 160, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>格式：</Text>
              <Select
                value={format}
                onChange={(v) => setFormat(v)}
                style={{ width: 120, marginLeft: 8 }}
                options={[
                  { value: "JSON", label: "JSON" },
                  { value: "CSV", label: "CSV" },
                  { value: "Excel", label: "Excel" },
                ]}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doExport}>
            执行导出
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="导出结果">
            <div style={{ display: "flex", gap: 32 }}>
              <Statistic title="导出数" value={report.exportedCount} />
              <Statistic title="文件大小(KB)" value={report.fileSizeKB} />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
