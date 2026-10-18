/**
 * 健澜科技 jlmedaios - 病历AI随访计划推荐前端页（M546-D，V14，EMR 深化四模块，M546 收官）
 *
 * 深海蓝VI：病历AI随访计划推荐（病历ID/科室/诊断/出院后天数/随访频率/下次随访天数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiFollowupPlanReco {
  recordId: string;
  dept: string;
}

interface FollowupResult {
  frequency: string;
  nextVisit: number;
}

interface FollowupReport {
  frequency: string;
  nextVisit: number;
}

export default function EmrAiFollowupPlanRecoPage() {
  const [base, setBase] = useState<AiFollowupPlanReco | null>(null);
  const [diagnosis, setDiagnosis] = useState("急性心梗");
  const [daysAfterDischarge, setDaysAfterDischarge] = useState(7);
  const [result, setResult] = useState<FollowupResult | null>(null);
  const [report, setReport] = useState<FollowupReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-followup-plan-reco", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 随访计划推荐基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doRecommend = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-followup-plan-reco", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ diagnosis, daysAfterDischarge }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("随访计划推荐生成完成");
      } else {
        message.error("随访计划推荐生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI随访计划推荐</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="随访输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>诊断：</Text>
              <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ width: 200, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>出院后天数：</Text>
              <Input
                type="number"
                value={daysAfterDischarge}
                onChange={(e) => setDaysAfterDischarge(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doRecommend}>
            生成随访计划推荐
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="随访推荐结果">
            <Row gutter={24}>
              <Col span={12}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>随访频率：</Text>
                  <Tag color={report.frequency.includes("每周") ? "red" : "blue"} style={{ marginLeft: 8, fontSize: 16 }}>
                    {report.frequency}
                  </Tag>
                </div>
              </Col>
              <Col span={12}>
                <Statistic title="下次随访天数" value={report.nextVisit} suffix="天" valueStyle={{ color: VI.accent }} />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
