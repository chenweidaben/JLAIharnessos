/**
 * 健澜科技 jlmedaios - 病历AI检验解读前端页（M545-D，V14，EMR 深化四模块，M545 收官）
 *
 * 深海蓝VI：病历AI检验解读（病历ID/科室/检验项目/数值/参考范围/异常级别/AI建议）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiLabInterpret {
  recordId: string;
  dept: string;
}

interface InterpretResult {
  level: string;
  suggestion: string;
}

interface InterpretReport {
  level: string;
  suggestion: string;
}

const levelColor = (level: string): string => {
  if (level === "显著升高") return "red";
  return "green";
};

export default function EmrAiLabInterpretPage() {
  const [base, setBase] = useState<AiLabInterpret | null>(null);
  const [item, setItem] = useState("肌钙蛋白I");
  const [value, setValue] = useState(0.5);
  const [refRange, setRefRange] = useState("<0.04");
  const [result, setResult] = useState<InterpretResult | null>(null);
  const [report, setReport] = useState<InterpretReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-lab-interpret", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 检验解读基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doInterpret = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-lab-interpret", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ item, value, refRange }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("检验解读完成");
      } else {
        message.error("检验解读失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI检验解读</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="检验输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>检验项目：</Text>
              <Input value={item} onChange={(e) => setItem(e.target.value)} style={{ width: 160, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>数值：</Text>
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                style={{ width: 100, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>参考范围：</Text>
              <Input value={refRange} onChange={(e) => setRefRange(e.target.value)} style={{ width: 100, marginLeft: 8 }} />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doInterpret}>
            生成检验解读
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="解读结果">
            <Row gutter={24}>
              <Col span={8}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>异常级别：</Text>
                  <Tag color={levelColor(report.level)} style={{ marginLeft: 8, fontSize: 16 }}>
                    {report.level}
                  </Tag>
                </div>
              </Col>
              <Col span={16}>
                <Text strong style={{ fontSize: 16 }}>AI建议：</Text>
                <Text style={{ marginLeft: 8, fontSize: 16 }}>{report.suggestion}</Text>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
