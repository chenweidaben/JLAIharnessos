/**
 * 健澜科技 jlmedaios - 病历自动归档触发前端页（M521-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历自动归档触发（记录ID/科室/出院后天数/归档配置/触发结果/原因）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Checkbox, Col, InputNumber, Layout, Row, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AutoArchive {
  recordId: string;
  dept: string;
  daysSinceDischarge: number;
}

interface TriggerResult {
  triggered: boolean;
  reason: string;
}

interface ArchiveReport {
  triggered: boolean;
  reason: string;
}

export default function EmrQcAutoArchivePage() {
  const [archive, setArchive] = useState<AutoArchive | null>(null);
  const [daysSinceDischarge, setDaysSinceDischarge] = useState(35);
  const [archiveAfterDays, setArchiveAfterDays] = useState(30);
  const [requireQcPass, setRequireQcPass] = useState(true);
  const [qcPassed, setQcPassed] = useState(true);
  const [result, setResult] = useState<TriggerResult | null>(null);
  const [report, setReport] = useState<ArchiveReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchArchive = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-auto-archive", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setArchive(data?.data ?? null);
        }
      } catch {
        message.error("加载归档触发基础数据失败");
      }
    };
    void fetchArchive();
  }, []);

  const doTrigger = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-auto-archive", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          daysSinceDischarge,
          config: { archiveAfterDays, requireQcPass, qcPassed },
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("归档触发完成");
      } else {
        message.error("触发失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历自动归档触发</Title>
        {archive && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="归档触发基础数据">
            <div>
              <Text strong>记录ID：</Text><Text style={{ marginRight: 24 }}>{archive.recordId}</Text>
              <Text strong>科室：</Text><Text style={{ marginRight: 24 }}>{archive.dept}</Text>
              <Text strong>出院后天数：</Text><Text>{archive.daysSinceDischarge}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="归档配置">
          <Row gutter={16}>
            <Col span={8}>
              <Text>出院后天数</Text>
              <InputNumber value={daysSinceDischarge} onChange={(v) => setDaysSinceDischarge(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
            <Col span={8}>
              <Text>归档阈值（天）</Text>
              <InputNumber value={archiveAfterDays} onChange={(v) => setArchiveAfterDays(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
            <Col span={8}>
              <div style={{ marginTop: 32 }}>
                <Checkbox checked={requireQcPass} onChange={(e) => setRequireQcPass(e.target.checked)}>要求质控通过</Checkbox>
                <Checkbox checked={qcPassed} onChange={(e) => setQcPassed(e.target.checked)} style={{ marginLeft: 16 }}>质控已通过</Checkbox>
              </div>
            </Col>
          </Row>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doTrigger}>
            触发归档
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="触发结果">
            <div style={{ marginBottom: 16 }}>
              <Text strong>触发结果：</Text>
              <Tag color={report.triggered ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                {report.triggered ? "已触发" : "未触发"}
              </Tag>
            </div>
            <div>
              <Text strong>原因：</Text>
              <Text style={{ marginLeft: 8 }}>{report.reason}</Text>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
