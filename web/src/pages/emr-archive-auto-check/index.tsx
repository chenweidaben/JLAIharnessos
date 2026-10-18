/**
 * 健澜科技 jlmedaios - 病历归档自动检查前端页（M527-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历归档自动检查（病历ID/科室/出院小结/签名/费用结算/可否归档/缺失项数/缺失列表）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Checkbox, Layout, List, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ArchiveAutoCheck {
  recordId: string;
  dept: string;
}

interface ArchiveCheckResult {
  canArchive: boolean;
  missingItems: string[];
}

interface ArchiveCheckReport {
  canArchive: boolean;
  missingCount: number;
}

export default function EmrArchiveAutoCheckPage() {
  const [check, setCheck] = useState<ArchiveAutoCheck | null>(null);
  const [hasDischargeSummary, setHasDischargeSummary] = useState(true);
  const [hasSignature, setHasSignature] = useState(true);
  const [hasPayment, setHasPayment] = useState(true);
  const [result, setResult] = useState<ArchiveCheckResult | null>(null);
  const [report, setReport] = useState<ArchiveCheckReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCheck = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-archive-auto-check", {
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
      const resp = await fetch("/api/v1/emr-archive-auto-check", {
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
        <Title level={3} style={{ color: VI.deep }}>病历归档自动检查</Title>
        {check && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{check.recordId}</Text>
              <Text strong>科室：</Text><Text>{check.dept}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="归档前条件">
          <div style={{ display: "flex", gap: 24, flexWrap: "wrap", flexDirection: "column" }}>
            <Checkbox checked={hasDischargeSummary} onChange={(e) => setHasDischargeSummary(e.target.checked)}>
              已完成出院小结
            </Checkbox>
            <Checkbox checked={hasSignature} onChange={(e) => setHasSignature(e.target.checked)}>
              已完成医师签名
            </Checkbox>
            <Checkbox checked={hasPayment} onChange={(e) => setHasPayment(e.target.checked)}>
              已完成费用结算
            </Checkbox>
            <Button type="primary" style={{ background: VI.accent, marginTop: 8 }} loading={loading} onClick={doCheck}>
              执行归档检查
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="检查结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32, marginBottom: 16 }}>
              <div>
                <Text strong>可否归档：</Text>
                <Tag color={report.canArchive ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.canArchive ? "可归档" : "不可归档"}
                </Tag>
              </div>
              <Statistic title="缺失项数" value={report.missingCount} />
            </div>
            {result.missingItems.length > 0 && (
              <div>
                <Text strong>缺失列表：</Text>
                <List
                  size="small"
                  dataSource={result.missingItems}
                  renderItem={(item) => (
                    <List.Item>
                      <Tag color="orange">{item}</Tag>
                    </List.Item>
                  )}
                />
              </div>
            )}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
