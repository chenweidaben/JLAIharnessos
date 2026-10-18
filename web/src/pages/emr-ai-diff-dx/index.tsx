/**
 * 健澜科技 jlmedaios - 病历AI鉴别诊断前端页（M545-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI鉴别诊断（病历ID/科室/症状/鉴别诊断列表/候选数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, List, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiDiffDx {
  recordId: string;
  dept: string;
}

interface DiffDxResult {
  candidates: string[];
  count: number;
}

interface DiffDxReport {
  candidates: string[];
  count: number;
}

export default function EmrAiDiffDxPage() {
  const [base, setBase] = useState<AiDiffDx | null>(null);
  const [symptom, setSymptom] = useState("胸痛伴大汗");
  const [result, setResult] = useState<DiffDxResult | null>(null);
  const [report, setReport] = useState<DiffDxReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-diff-dx", {
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

  const doSuggest = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-diff-dx", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ symptom }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("鉴别诊断生成完成");
      } else {
        message.error("鉴别诊断生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI鉴别诊断</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="症状输入">
          <div style={{ marginBottom: 16 }}>
            <Text strong>症状：</Text>
            <Input value={symptom} onChange={(e) => setSymptom(e.target.value)} style={{ width: 300, marginLeft: 8 }} />
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doSuggest}>
            生成鉴别诊断
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="鉴别诊断结果">
            <Row gutter={24}>
              <Col span={16}>
                <List
                  size="small"
                  dataSource={report.candidates}
                  renderItem={(item, index) => (
                    <List.Item>
                      <Tag color={index === 0 ? "red" : index === 1 ? "orange" : "default"} style={{ marginRight: 8 }}>
                        候选{index + 1}
                      </Tag>
                      <Text>{item}</Text>
                    </List.Item>
                  )}
                />
              </Col>
              <Col span={8}>
                <Statistic title="候选数" value={report.count} valueStyle={{ color: VI.accent }} />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
