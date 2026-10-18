/**
 * 健澜科技 jlmedaios - 病历 NLP 否定检测前端页（M531-D，V14，EMR 深化四模块，M531 收官）
 *
 * 深海蓝VI：病历NLP否定检测（病历ID/科室/句子/目标词/是否否定/范围）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface NlpNegationDetect {
  recordId: string;
  dept: string;
}

interface NlpResult {
  isNegated: boolean;
  scope: string;
}

interface NlpReport {
  isNegated: boolean;
  scope: string;
}

export default function EmrNlpNegationDetectPage() {
  const [nlp, setNlp] = useState<NlpNegationDetect | null>(null);
  const [sentence, setSentence] = useState("患者无胸痛症状");
  const [target, setTarget] = useState("胸痛");
  const [result, setResult] = useState<NlpResult | null>(null);
  const [report, setReport] = useState<NlpReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchNlp = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-nlp-negation-detect", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setNlp(data?.data ?? null);
        }
      } catch {
        message.error("加载否定检测基础数据失败");
      }
    };
    void fetchNlp();
  }, []);

  const doDetect = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-nlp-negation-detect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ sentence, target }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("检测完成");
      } else {
        message.error("检测失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历NLP否定检测</Title>
        {nlp && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{nlp.recordId}</Text>
              <Text strong>科室：</Text><Text>{nlp.dept}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="输入">
          <div style={{ marginBottom: 16 }}>
            <Text strong>句子：</Text>
            <TextArea
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
              rows={3}
              style={{ marginTop: 8 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text strong>目标词：</Text>
            <Input value={target} onChange={(e) => setTarget(e.target.value)} style={{ width: 240, marginLeft: 8 }} />
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doDetect}>
            执行检测
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="检测结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <Text strong>是否否定：</Text>
                <Tag color={report.isNegated ? "red" : "green"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.isNegated ? "否定" : "肯定"}
                </Tag>
              </div>
              <div>
                <Text strong>范围：</Text>
                <Tag color={report.isNegated ? "orange" : "blue"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.scope}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
