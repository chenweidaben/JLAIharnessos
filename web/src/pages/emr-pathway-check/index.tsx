/**
 * 健澜科技 jlmedaios - 病历临床路径符合性检查前端页（M537-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历临床路径符合性检查（病历ID/路径名/预期步骤/实际步骤/偏差天数/是否符合/符合率）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface PathwayCheck {
  recordId: string;
  pathwayName: string;
}

interface CheckResult {
  compliant: boolean;
  complianceRate: number;
}

interface CheckReport {
  compliant: boolean;
  complianceRate: number;
}

export default function EmrPathwayCheckPage() {
  const [check, setCheck] = useState<PathwayCheck | null>(null);
  const [expectedSteps, setExpectedSteps] = useState(10);
  const [actualSteps, setActualSteps] = useState(9);
  const [deviationDays, setDeviationDays] = useState(1);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [report, setReport] = useState<CheckReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCheck = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-pathway-check", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setCheck(data?.data ?? null);
        }
      } catch {
        message.error("加载路径检查基础数据失败");
      }
    };
    void fetchCheck();
  }, []);

  const doCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-pathway-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ expectedSteps, actualSteps, deviationDays }),
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
        <Title level={3} style={{ color: VI.deep }}>病历临床路径符合性检查</Title>
        {check && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{check.recordId}</Text>
              <Text strong>路径名：</Text><Text>{check.pathwayName}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="检查输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>预期步骤：</Text>
              <Input
                type="number"
                value={expectedSteps}
                onChange={(e) => setExpectedSteps(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>实际步骤：</Text>
              <Input
                type="number"
                value={actualSteps}
                onChange={(e) => setActualSteps(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>偏差天数：</Text>
              <Input
                type="number"
                value={deviationDays}
                onChange={(e) => setDeviationDays(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
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
                <Text strong>是否符合：</Text>
                <Tag color={report.compliant ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.compliant ? "符合" : "不符合"}
                </Tag>
              </div>
              <Statistic title="符合率(%)" value={report.complianceRate} precision={1} />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
