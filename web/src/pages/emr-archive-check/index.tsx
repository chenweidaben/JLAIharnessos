/**
 * 健澜科技 jlmedaios - 病历自动归档检查前端页（M533-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历自动归档检查（病历ID/科室/出院小结/签名/费用结算/是否就绪/缺失数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Switch, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ArchiveCheck {
  recordId: string;
  dept: string;
}

interface CheckResult {
  ready: boolean;
  missingCount: number;
}

interface CheckReport {
  ready: boolean;
  missingCount: number;
}

export default function EmrArchiveCheckPage() {
  const [check, setCheck] = useState<ArchiveCheck | null>(null);
  const [hasDischargeSummary, setHasDischargeSummary] = useState(true);
  const [hasSignature, setHasSignature] = useState(true);
  const [hasPayment, setHasPayment] = useState(true);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [report, setReport] = useState<CheckReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCheck = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-archive-check", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setCheck(data?.data ?? null);
        }
      } catch {
        message.error("加载归档检查基础数据失败");
      }
    };
    void fetchCheck();
  }, []);

  const doCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-archive-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ hasDischargeSummary, hasSignature, hasPayment }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("检查完成");
      } else {
        message.error("检查失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历自动归档检查</Title>
        {check && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{check.recordId}</Text>
              <Text strong>科室：</Text><Text>{check.dept}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="检查项">
          <div style={{ display: "flex", gap: 32, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>出院小结：</Text>
              <Switch checked={hasDischargeSummary} onChange={setHasDischargeSummary} style={{ marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>签名：</Text>
              <Switch checked={hasSignature} onChange={setHasSignature} style={{ marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>费用结算：</Text>
              <Switch checked={hasPayment} onChange={setHasPayment} style={{ marginLeft: 8 }} />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doCheck}>
            执行检查
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="检查结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <Text strong>是否就绪：</Text>
                <Tag color={report.ready ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.ready ? "就绪" : "未就绪"}
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
