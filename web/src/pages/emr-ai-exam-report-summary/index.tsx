/**
 * 健澜科技 jlmedaios - 病历AI检查报告AI解读摘要前端页（M561-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI检查报告AI解读摘要（病历ID/科室/检查类型/检查所见/AI摘要/AI印象）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Input, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };
const { TextArea } = Input;

interface AiExamReportSummary {
  recordId: string;
  dept: string;
}

interface SummaryResult {
  summary: string;
  impression: string;
}

interface SummaryReport {
  summary: string;
  impression: string;
}

export default function EmrAiExamReportSummaryPage() {
  const [base, setBase] = useState<AiExamReportSummary | null>(null);
  const [examType, setExamType] = useState("胸部CT");
  const [findings, setFindings] = useState("右下肺见斑片状阴影，考虑炎症");
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [report, setReport] = useState<SummaryReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-exam-report-summary", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 检查报告AI解读摘要基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doSummarize = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-exam-report-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ examType, findings }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("检查报告AI解读摘要完成");
      } else {
        message.error("检查报告AI解读摘要失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI检查报告AI解读摘要</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="解读输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>检查类型：</Text>
            <Input value={examType} onChange={(e) => setExamType(e.target.value)} style={{ width: 200 }} />
            <Text strong>检查所见：</Text>
            <Input value={findings} onChange={(e) => setFindings(e.target.value)} style={{ width: 320 }} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doSummarize}>
              AI解读摘要
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="解读结果">
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 16 }}>AI摘要：</Text>
              <TextArea value={report.summary} readOnly autoSize={{ minRows: 2 }} style={{ marginTop: 8, fontSize: 16 }} />
            </div>
            <div>
              <Text strong style={{ fontSize: 16 }}>AI印象：</Text>
              <Tag color={report.impression.includes("建议") ? "orange" : "green"} style={{ marginLeft: 8, fontSize: 16 }}>
                {report.impression}
              </Tag>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
