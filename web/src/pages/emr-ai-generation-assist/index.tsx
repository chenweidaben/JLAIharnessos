/**
 * 健澜科技 jlmedaios - AI病历生成辅助前端页（M522-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：AI病历生成辅助（病历类型/科室/症状列表/草稿长度/字段数/置信度/质量评级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiGenerationAssist {
  recordType: string;
  dept: string;
}

interface GenerationResult {
  draftLength: number;
  fieldCount: number;
  confidence: number;
}

interface GenerationReport {
  draftLength: number;
  confidence: number;
  quality: string;
}

export default function EmrAiGenerationAssistPage() {
  const [assist, setAssist] = useState<AiGenerationAssist | null>(null);
  const [symptomsInput, setSymptomsInput] = useState("胸痛,胸闷,气促");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [report, setReport] = useState<GenerationReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchAssist = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-generation-assist", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setAssist(data?.data ?? null);
        }
      } catch {
        message.error("加载生成辅助基础数据失败");
      }
    };
    void fetchAssist();
  }, []);

  const doGenerate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const symptoms = symptomsInput.split(/[,，\s]+/).filter((s) => s.length > 0);
      const resp = await fetch("/api/v1/emr-ai-generation-assist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ symptoms }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("生成完成");
      } else {
        message.error("生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>AI病历生成辅助</Title>
        {assist && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="生成辅助基础数据">
            <div>
              <Text strong>病历类型：</Text><Text style={{ marginRight: 24 }}>{assist.recordType}</Text>
              <Text strong>科室：</Text><Text>{assist.dept}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="症状输入">
          <Input
            placeholder="输入症状，用逗号分隔"
            value={symptomsInput}
            onChange={(e) => setSymptomsInput(e.target.value)}
          />
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doGenerate}>
            AI生成草稿
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="生成结果">
            <div style={{ display: "flex", gap: 32, marginBottom: 16 }}>
              <Statistic title="草稿长度" value={result.draftLength} />
              <Statistic title="字段数" value={result.fieldCount} />
              <Statistic title="置信度" value={result.confidence} precision={2} />
            </div>
            <div>
              <Text strong>质量评级：</Text>
              <Tag color={report.quality === "高质量草稿" ? "green" : report.quality === "可用草稿" ? "blue" : "orange"} style={{ marginLeft: 8 }}>
                {report.quality}
              </Tag>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
