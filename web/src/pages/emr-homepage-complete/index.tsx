/**
 * 健澜科技 jlmedaios - 病案首页完整性校验前端页（M535-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病案首页完整性校验（病历ID/科室/主诊断/主手术/入院日期/出院日期/是否完整/缺失数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Statistic, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface HomepageComplete {
  recordId: string;
  dept: string;
}

interface CompleteResult {
  complete: boolean;
  missingCount: number;
}

interface CompleteReport {
  complete: boolean;
  missingCount: number;
}

export default function EmrHomepageCompletePage() {
  const [check, setCheck] = useState<HomepageComplete | null>(null);
  const [hasMainDiagnosis, setHasMainDiagnosis] = useState(true);
  const [hasMainSurgery, setHasMainSurgery] = useState(true);
  const [hasAdmissionDate, setHasAdmissionDate] = useState(true);
  const [hasDischargeDate, setHasDischargeDate] = useState(true);
  const [result, setResult] = useState<CompleteResult | null>(null);
  const [report, setReport] = useState<CompleteReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCheck = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-homepage-complete", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setCheck(data?.data ?? null);
        }
      } catch {
        message.error("加载首页完整性校验基础数据失败");
      }
    };
    void fetchCheck();
  }, []);

  const doCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-homepage-complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ hasMainDiagnosis, hasMainSurgery, hasAdmissionDate, hasDischargeDate }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("校验完成");
      } else {
        message.error("校验失败");
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
        <Title level={3} style={{ color: VI.deep }}>病案首页完整性校验</Title>
        {check && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{check.recordId}</Text>
              <Text strong>科室：</Text><Text>{check.dept}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="校验项">
          <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>主诊断：</Text>
              <Switch checked={hasMainDiagnosis} onChange={setHasMainDiagnosis} style={{ marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>主手术：</Text>
              <Switch checked={hasMainSurgery} onChange={setHasMainSurgery} style={{ marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>入院日期：</Text>
              <Switch checked={hasAdmissionDate} onChange={setHasAdmissionDate} style={{ marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>出院日期：</Text>
              <Switch checked={hasDischargeDate} onChange={setHasDischargeDate} style={{ marginLeft: 8 }} />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doCheck}>
            执行校验
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="校验结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <Text strong>是否完整：</Text>
                <Tag color={report.complete ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.complete ? "完整" : "不完整"}
                </Tag>
              </div>
              <Statistic title="缺失数" value={report.missingCount} />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
