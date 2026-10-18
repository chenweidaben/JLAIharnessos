/**
 * 健澜科技 jlmedaios - 病历结构化录入辅助前端页（M539-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历结构化录入辅助（病历ID/字段名/原始文本/是否填充/建议值）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

const { TextArea } = Input;

interface StructuredInput {
  recordId: string;
  fieldName: string;
}

interface InputResult {
  filled: boolean;
  suggestedValue: string;
}

interface InputReport {
  filled: boolean;
  suggestedValue: string;
}

export default function EmrStructuredInputPage() {
  const [base, setBase] = useState<StructuredInput | null>(null);
  const [rawText, setRawText] = useState("胸闷3天");
  const [fieldType, setFieldType] = useState("主诉");
  const [result, setResult] = useState<InputResult | null>(null);
  const [report, setReport] = useState<InputReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-structured-input", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载结构化录入基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doAssist = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-structured-input", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ rawText, fieldType }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("辅助完成");
      } else {
        message.error("辅助失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历结构化录入辅助</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>字段名：</Text><Tag color="blue">{base.fieldName}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="录入输入">
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
            <div>
              <Text strong>原始文本：</Text>
              <TextArea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={3}
                style={{ marginTop: 8 }}
                placeholder="请输入原始文本"
              />
            </div>
            <div>
              <Text strong>字段类型：</Text>
              <Input value={fieldType} onChange={(e) => setFieldType(e.target.value)} style={{ width: 200, marginLeft: 8 }} />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doAssist}>
            执行辅助
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="辅助结果">
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
              <Text strong>是否填充：</Text>
              <Tag color={report.filled ? "green" : "red"} style={{ fontSize: 16 }}>
                {report.filled ? "已填充" : "未填充"}
              </Tag>
            </div>
            <div>
              <Text strong>建议值：</Text>
              <Tag color="blue" style={{ marginLeft: 8, fontSize: 16 }}>{report.suggestedValue}</Tag>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
