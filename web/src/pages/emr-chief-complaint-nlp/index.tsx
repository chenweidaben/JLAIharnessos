/**
 * 健澜科技 jlmedaios - 病历主诉结构化提取前端页（M529-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历主诉结构化提取（病历ID/科室/原始文本/症状/持续时间/是否含症状/字段数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ChiefComplaintNlp {
  recordId: string;
  dept: string;
}

interface NlpResult {
  symptom: string;
  duration: string;
  hasSymptom: boolean;
}

interface NlpReport {
  hasSymptom: boolean;
  fieldCount: number;
}

const DEFAULT_TEXT = "胸痛 3天";

export default function EmrChiefComplaintNlpPage() {
  const [nlp, setNlp] = useState<ChiefComplaintNlp | null>(null);
  const [rawText, setRawText] = useState(DEFAULT_TEXT);
  const [result, setResult] = useState<NlpResult | null>(null);
  const [report, setReport] = useState<NlpReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNlp = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-chief-complaint-nlp", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setNlp(data?.data ?? null);
        }
      } catch {
        message.error("加载主诉提取基础数据失败");
      }
    };
    void fetchNlp();
  }, []);

  const doExtract = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-chief-complaint-nlp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ rawText }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("提取完成");
      } else {
        message.error("提取失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历主诉结构化提取</Title>
        {nlp && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{nlp.recordId}</Text>
              <Text strong>科室：</Text><Text>{nlp.dept}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="原始文本">
          <TextArea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            rows={3}
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doExtract}>
            执行提取
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="提取结果">
            <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
              <div>
                <Text strong>症状：</Text>
                <Tag color={VI.accent} style={{ marginLeft: 8, fontSize: 16 }}>{result.symptom}</Tag>
              </div>
              <div>
                <Text strong>持续时间：</Text>
                <Text style={{ marginLeft: 8, fontSize: 16 }}>{result.duration || "（无）"}</Text>
              </div>
              <div>
                <Text strong>是否含症状：</Text>
                <Tag color={result.hasSymptom ? "green" : "default"} style={{ marginLeft: 8 }}>
                  {result.hasSymptom ? "是" : "否"}
                </Tag>
              </div>
            </div>
            <Statistic title="提取字段数" value={report.fieldCount} />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
