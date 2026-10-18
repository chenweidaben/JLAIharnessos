/**
 * 健澜科技 jlmedaios - 病历保存期限提醒前端页（M541-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历保存期限提醒（病历ID/科室/归档年数/保存年限/剩余月数/是否临期）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RetentionRemind {
  recordId: string;
  dept: string;
}

interface RemindResult {
  expiring: boolean;
  monthsLeft: number;
}

interface RemindReport {
  expiring: boolean;
  monthsLeft: number;
}

export default function EmrRetentionRemindPage() {
  const [base, setBase] = useState<RetentionRemind | null>(null);
  const [yearsSinceArchive, setYearsSinceArchive] = useState(29.5);
  const [retentionYears, setRetentionYears] = useState(30);
  const [result, setResult] = useState<RemindResult | null>(null);
  const [report, setReport] = useState<RemindReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-retention-remind", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载保存期限提醒基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doDetect = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-retention-remind", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ yearsSinceArchive, retentionYears }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("检测完成");
      } else {
        message.error("检测失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历保存期限提醒</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="检测输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>归档年数：</Text>
              <Input
                type="number"
                step="0.5"
                value={yearsSinceArchive}
                onChange={(e) => setYearsSinceArchive(Number(e.target.value))}
                style={{ width: 140, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>保存年限：</Text>
              <Input
                type="number"
                value={retentionYears}
                onChange={(e) => setRetentionYears(Number(e.target.value))}
                style={{ width: 140, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doDetect}>
            执行检测
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="检测结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="剩余月数" value={report.monthsLeft} />
              <div>
                <Text strong>是否临期：</Text>
                <Tag color={report.expiring ? "red" : "green"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.expiring ? "临期" : "充裕"}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
