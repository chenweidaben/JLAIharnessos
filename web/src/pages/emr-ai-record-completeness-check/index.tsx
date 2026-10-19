/**
 * 健澜科技 jlmedaios - 病历AI病历完整性检查前端页（M553-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI病历完整性检查（病历ID/科室/主诉/现病史/既往史/体格检查/缺失项数/完整率%）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, Row, Statistic, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiRecordCompletenessCheck {
  recordId: string;
  dept: string;
}

interface CheckResult {
  missingItems: number;
  completenessRate: number;
}

interface CheckReport {
  missingItems: number;
  completenessRate: number;
}

export default function EmrAiRecordCompletenessCheckPage() {
  const [base, setBase] = useState<AiRecordCompletenessCheck | null>(null);
  const [hasChiefComplaint, setHasChiefComplaint] = useState(true);
  const [hasPresentIllness, setHasPresentIllness] = useState(true);
  const [hasPastHistory, setHasPastHistory] = useState(true);
  const [hasPhysicalExam, setHasPhysicalExam] = useState(true);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [report, setReport] = useState<CheckReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-record-completeness-check", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 病历完整性检查基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-record-completeness-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ hasChiefComplaint, hasPresentIllness, hasPastHistory, hasPhysicalExam }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("完整性检查完成");
      } else {
        message.error("完整性检查失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI病历完整性检查</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="检查项输入">
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <div><Text strong>主诉：</Text><Switch checked={hasChiefComplaint} onChange={setHasChiefComplaint} style={{ marginLeft: 8 }} /></div>
            </Col>
            <Col span={6}>
              <div><Text strong>现病史：</Text><Switch checked={hasPresentIllness} onChange={setHasPresentIllness} style={{ marginLeft: 8 }} /></div>
            </Col>
            <Col span={6}>
              <div><Text strong>既往史：</Text><Switch checked={hasPastHistory} onChange={setHasPastHistory} style={{ marginLeft: 8 }} /></div>
            </Col>
            <Col span={6}>
              <div><Text strong>体格检查：</Text><Switch checked={hasPhysicalExam} onChange={setHasPhysicalExam} style={{ marginLeft: 8 }} /></div>
            </Col>
          </Row>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doCheck}>
            检查病历完整性
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="检查结果">
            <Row gutter={24}>
              <Col span={12}>
                <Statistic title="缺失项数" value={report.missingItems} valueStyle={{ color: report.missingItems > 0 ? "#cf1322" : VI.accent }} />
              </Col>
              <Col span={12}>
                <Statistic
                  title="完整率(%)"
                  value={report.completenessRate}
                  precision={1}
                  valueStyle={{ color: report.completenessRate >= 100 ? VI.accent : report.completenessRate >= 60 ? "#faad14" : "#cf1322" }}
                />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
