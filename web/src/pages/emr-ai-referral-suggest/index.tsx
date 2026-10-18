/**
 * 健澜科技 jlmedaios - 病历AI转诊建议前端页（M547-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI转诊建议（病历ID/科室/诊断/严重程度/是否需要转诊/目标科室）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiReferralSuggest {
  recordId: string;
  dept: string;
}

interface ReferralResult {
  needReferral: boolean;
  targetDept: string;
}

interface ReferralReport {
  needReferral: boolean;
  targetDept: string;
}

export default function EmrAiReferralSuggestPage() {
  const [base, setBase] = useState<AiReferralSuggest | null>(null);
  const [diagnosis, setDiagnosis] = useState("急性心梗");
  const [severity, setSeverity] = useState(9);
  const [result, setResult] = useState<ReferralResult | null>(null);
  const [report, setReport] = useState<ReferralReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-referral-suggest", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 转诊建议基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doSuggest = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-referral-suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ diagnosis, severity }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("转诊建议生成完成");
      } else {
        message.error("转诊建议生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI转诊建议</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="转诊输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>诊断：</Text>
              <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ width: 200, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>严重程度：</Text>
              <Input
                type="number"
                value={severity}
                onChange={(e) => setSeverity(Number(e.target.value))}
                style={{ width: 100, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doSuggest}>
            生成转诊建议
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="转诊建议结果">
            <Row gutter={24}>
              <Col span={12}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>是否需要转诊：</Text>
                  <Switch
                    checked={report.needReferral}
                    style={{ marginLeft: 8 }}
                    checkedChildren="需转诊"
                    unCheckedChildren="无需"
                  />
                </div>
              </Col>
              <Col span={12}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>目标科室：</Text>
                  <Tag color={report.needReferral ? "red" : "default"} style={{ marginLeft: 8, fontSize: 16 }}>
                    {report.targetDept}
                  </Tag>
                </div>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
