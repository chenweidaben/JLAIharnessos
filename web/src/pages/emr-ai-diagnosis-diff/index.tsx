/**
 * 健澜科技 jlmedaios - 病历AI鉴别诊断支持前端页（M550-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI鉴别诊断支持（病历ID/科室/症状/年龄/候选诊断列表/置信度）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, List, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiDiagnosisDiff {
  recordId: string;
  dept: string;
}

interface DiffResult {
  candidates: string[];
  confidence: number;
}

interface DiffReport {
  candidates: string[];
  confidence: number;
}

export default function EmrAiDiagnosisDiffPage() {
  const [base, setBase] = useState<AiDiagnosisDiff | null>(null);
  const [symptom, setSymptom] = useState("胸痛伴大汗");
  const [age, setAge] = useState(65);
  const [result, setResult] = useState<DiffResult | null>(null);
  const [report, setReport] = useState<DiffReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-diagnosis-diff", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 鉴别诊断基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doDiff = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-diagnosis-diff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ symptom, age }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("鉴别诊断完成");
      } else {
        message.error("鉴别诊断失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI鉴别诊断支持</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="诊断输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>症状：</Text>
            <Input
              value={symptom}
              onChange={(e) => setSymptom(e.target.value)}
              style={{ width: 200 }}
              placeholder="如：胸痛伴大汗 / 咳嗽"
            />
            <Text strong>年龄：</Text>
            <Input
              type="number"
              value={age}
              onChange={(e) => setAge(Number(e.target.value))}
              style={{ width: 100 }}
            />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doDiff}>
              鉴别诊断
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="鉴别诊断结果">
            <Row gutter={24}>
              <Col span={16}>
                <Text strong>候选诊断：</Text>
                <List
                  size="small"
                  dataSource={report.candidates}
                  renderItem={(item: string, idx: number) => (
                    <List.Item>
                      <Tag color={idx === 0 ? "red" : idx === 1 ? "orange" : "blue"}>{item}</Tag>
                    </List.Item>
                  )}
                  style={{ marginTop: 8 }}
                />
              </Col>
              <Col span={8}>
                <Statistic title="置信度" value={report.confidence} precision={2} valueStyle={{ color: VI.accent }} />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
