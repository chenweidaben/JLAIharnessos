/**
 * 健澜科技 jlmedaios - 病历水印追踪前端页（M528-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历水印追踪（病历ID/水印文字/操作人/水印ID/是否可追踪）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface WatermarkTrace {
  recordId: string;
  watermarkText: string;
}

interface WatermarkResult {
  watermarkId: string;
  traceable: boolean;
}

interface WatermarkReport {
  watermarkId: string;
  traceable: boolean;
}

export default function EmrWatermarkTracePage() {
  const [trace, setTrace] = useState<WatermarkTrace | null>(null);
  const [result, setResult] = useState<WatermarkResult | null>(null);
  const [report, setReport] = useState<WatermarkReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTrace = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-watermark-trace", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setTrace(data?.data ?? null);
        }
      } catch {
        message.error("加载水印追踪基础数据失败");
      }
    };
    void fetchTrace();
  }, []);

  const doApply = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-watermark-trace", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ recordId: "REC052", operator: "张医生", watermarkText: "内部使用" }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("水印应用完成");
      } else {
        message.error("水印应用失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历水印追踪</Title>
        {trace && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{trace.recordId}</Text>
              <Text strong>水印文字：</Text><Tag color={VI.accent}>{trace.watermarkText}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="水印应用">
          <div style={{ marginBottom: 12 }}>
            <Text>操作人：张医生</Text>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doApply}>
            应用水印
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="应用结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="水印ID" value={report.watermarkId} />
              <div>
                <Text strong>是否可追踪：</Text>
                <Tag color={report.traceable ? "green" : "default"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.traceable ? "可追踪" : "不可追踪"}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
