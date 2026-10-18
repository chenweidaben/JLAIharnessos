/**
 * 健澜科技 jlmedaios - 病历AI患者教育材料生成前端页（M547-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI患者教育材料生成（病历ID/科室/诊断/材料标题/材料内容）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiPatientEdu {
  recordId: string;
  dept: string;
}

interface EduResult {
  title: string;
  content: string;
}

interface EduReport {
  title: string;
  content: string;
}

export default function EmrAiPatientEduPage() {
  const [base, setBase] = useState<AiPatientEdu | null>(null);
  const [diagnosis, setDiagnosis] = useState("急性心梗");
  const [result, setResult] = useState<EduResult | null>(null);
  const [report, setReport] = useState<EduReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-patient-edu", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 患者教育材料基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doGenerate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-patient-edu", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ diagnosis }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("教育材料生成完成");
      } else {
        message.error("教育材料生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI患者教育材料生成</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="生成输入">
          <div style={{ marginBottom: 16 }}>
            <Text strong>诊断：</Text>
            <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ width: 300, marginLeft: 8 }} />
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doGenerate}>
            生成教育材料
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="AI 生成教育材料">
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 18 }}>{report.title}</Text>
            </div>
            <Paragraph style={{ fontSize: 16, lineHeight: 1.8 }}>{report.content}</Paragraph>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
