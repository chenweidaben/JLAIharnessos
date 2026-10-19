/**
 * 健澜科技 jlmedaios - 病历AI出院随访计划推荐前端页（M563-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI出院随访计划推荐（病历ID/科室/诊断/出院天数/建议随访天数/随访方式）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, InputNumber, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiDischargeFollowupReco {
  recordId: string;
  dept: string;
}

interface RecoResult {
  followupDays: number;
  followupMethod: string;
}

interface RecoReport {
  followupDays: number;
  followupMethod: string;
}

function methodColor(m: string): string {
  if (m === "门诊+电话随访") return "red";
  if (m === "门诊复查") return "orange";
  return "blue";
}

export default function EmrAiDischargeFollowupRecoPage() {
  const [base, setBase] = useState<AiDischargeFollowupReco | null>(null);
  const [diagnosis, setDiagnosis] = useState("恶性肿瘤术后");
  const [dischargeDay, setDischargeDay] = useState(5);
  const [result, setResult] = useState<RecoResult | null>(null);
  const [report, setReport] = useState<RecoReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-discharge-followup-reco", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 出院随访计划推荐基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doReco = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-discharge-followup-reco", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ diagnosis, dischargeDay }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("出院随访计划推荐完成");
      } else {
        message.error("出院随访计划推荐失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI出院随访计划推荐</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="推荐输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>诊断：</Text>
            <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ width: 200 }} />
            <Text strong>出院天数：</Text>
            <InputNumber min={0} max={30} value={dischargeDay} onChange={(v) => setDischargeDay(Number(v ?? 0))} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doReco}>
              智能推荐
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="推荐结果">
            <Row gutter={24}>
              <Col span={8}>
                <Statistic title="建议随访天数" value={report.followupDays} suffix="天" />
              </Col>
              <Col span={16}>
                <Text strong style={{ fontSize: 16 }}>随访方式：</Text>
                <Tag color={methodColor(report.followupMethod)} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.followupMethod}
                </Tag>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
