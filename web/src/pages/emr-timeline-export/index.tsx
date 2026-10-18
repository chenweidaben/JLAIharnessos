/**
 * 健澜科技 jlmedaios - 病历时间线导出前端页（M538-D，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历时间线导出（病历ID/导出格式/事件数/是否导出/文件大小KB）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Select, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface TimelineExport {
  recordId: string;
  format: string;
}

interface ExportResult {
  exported: boolean;
  fileSizeKB: number;
}

interface ExportReport {
  exported: boolean;
  fileSizeKB: number;
}

export default function EmrTimelineExportPage() {
  const [exportBase, setExportBase] = useState<TimelineExport | null>(null);
  const [recordId, setRecordId] = useState("REC503");
  const [eventCount, setEventCount] = useState(12);
  const [format, setFormat] = useState<"PDF" | "Excel" | "JSON">("PDF");
  const [result, setResult] = useState<ExportResult | null>(null);
  const [report, setReport] = useState<ExportReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchExport = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-timeline-export", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setExportBase(data?.data ?? null);
        }
      } catch {
        message.error("加载导出基础数据失败");
      }
    };
    void fetchExport();
  }, []);

  const doExport = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-timeline-export", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ recordId, eventCount, format }),
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
        <Title level={3} style={{ color: VI.deep }}>病历时间线导出</Title>
        {exportBase && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{exportBase.recordId}</Text>
              <Text strong>导出格式：</Text><Tag color="blue">{exportBase.format}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="导出输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>病历ID：</Text>
              <Input value={recordId} onChange={(e) => setRecordId(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>事件数：</Text>
              <Input
                type="number"
                value={eventCount}
                onChange={(e) => setEventCount(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>导出格式：</Text>
              <Select
                value={format}
                onChange={(v) => setFormat(v)}
                style={{ width: 120, marginLeft: 8 }}
                options={[
                  { value: "PDF", label: "PDF" },
                  { value: "Excel", label: "Excel" },
                  { value: "JSON", label: "JSON" },
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
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <Text strong>是否导出：</Text>
                <Tag color={report.exported ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.exported ? "已导出" : "未导出"}
                </Tag>
              </div>
              <Statistic title="文件大小（KB）" value={report.fileSizeKB} />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
