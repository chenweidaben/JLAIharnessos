/**
 * 健澜科技 jlmedaios - 病历AI护理建议前端页（M546-C，V14，EMR 深化四模块，-suggest 后缀避让旧作废 -reco）
 *
 * 深海蓝VI：病历AI护理建议（病历ID/科室/诊断/年龄/护理级别/护理措施列表）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, List, Row, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiNursingSuggest {
  recordId: string;
  dept: string;
}

interface NursingResult {
  level: string;
  items: string[];
}

interface NursingReport {
  level: string;
  items: string[];
}

const levelColor = (level: string): string => {
  if (level === "特级护理") return "red";
  return "blue";
};

export default function EmrAiNursingSuggestPage() {
  const [base, setBase] = useState<AiNursingSuggest | null>(null);
  const [diagnosis, setDiagnosis] = useState("急性心梗");
  const [age, setAge] = useState(65);
  const [result, setResult] = useState<NursingResult | null>(null);
  const [report, setReport] = useState<NursingReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-nursing-suggest", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 护理建议基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doSuggest = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-nursing-suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ diagnosis, age }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("护理建议生成完成");
      } else {
        message.error("护理建议生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI护理建议</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="护理输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>诊断：</Text>
              <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ width: 200, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>年龄：</Text>
              <Input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                style={{ width: 100, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doSuggest}>
            生成护理建议
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="护理建议结果">
            <Row gutter={24}>
              <Col span={8}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>护理级别：</Text>
                  <Tag color={levelColor(report.level)} style={{ marginLeft: 8, fontSize: 16 }}>
                    {report.level}
                  </Tag>
                </div>
              </Col>
              <Col span={16}>
                <List
                  size="small"
                  dataSource={report.items}
                  renderItem={(item) => (
                    <List.Item>
                      <Tag color="cyan" style={{ marginRight: 8 }}>护理措施</Tag>
                      <Text>{item}</Text>
                    </List.Item>
                  )}
                />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
