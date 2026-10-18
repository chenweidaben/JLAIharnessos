/**
 * 健澜科技 jlmedaios - 质控规则版本管理前端页（M519-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：质控规则版本管理（规则名/版本号/变更日志/版本对比/变更字段/破坏性变更标记）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Checkbox, Input, InputNumber, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RuleVersion {
  ruleName: string;
  version: string;
  changeLog: string;
}

interface VersionCompareResult {
  changedFields: string[];
  isBreaking: boolean;
}

interface VersionReport {
  changeCount: number;
  isBreaking: boolean;
}

export default function EmrQcRuleVersionPage() {
  const [version, setVersion] = useState<RuleVersion | null>(null);
  const [oldThreshold, setOldThreshold] = useState(24);
  const [oldEnabled, setOldEnabled] = useState(true);
  const [newThreshold, setNewThreshold] = useState(12);
  const [newEnabled, setNewEnabled] = useState(true);
  const [result, setResult] = useState<VersionCompareResult | null>(null);
  const [report, setReport] = useState<VersionReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-rule-version", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setVersion(data?.data ?? null);
        }
      } catch {
        message.error("加载规则版本基础数据失败");
      }
    };
    void fetchVersion();
  }, []);

  const doCompare = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-rule-version", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          oldVersion: { threshold: oldThreshold, enabled: oldEnabled },
          newVersion: { threshold: newThreshold, enabled: newEnabled },
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("版本对比完成");
      } else {
        message.error("对比失败");
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
        <Title level={3} style={{ color: VI.deep }}>质控规则版本管理</Title>
        {version && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="规则版本基础数据">
            <div>
              <Text strong>规则名：</Text><Text style={{ marginRight: 24 }}>{version.ruleName}</Text>
              <Text strong>版本号：</Text>
              <Tag color={VI.accent} style={{ marginRight: 24 }}>{version.version}</Tag>
              <Text strong>变更日志：</Text><Text>{version.changeLog}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="版本对比输入">
          <div style={{ marginBottom: 16 }}>
            <Text strong>旧版本</Text>
            <div style={{ marginTop: 8 }}>
              <Text>阈值：</Text>
              <InputNumber value={oldThreshold} onChange={(v) => setOldThreshold(Number(v ?? 0))} style={{ marginLeft: 8, width: 120 }} />
              <Checkbox checked={oldEnabled} onChange={(e) => setOldEnabled(e.target.checked)} style={{ marginLeft: 16 }}>启用</Checkbox>
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text strong>新版本</Text>
            <div style={{ marginTop: 8 }}>
              <Text>阈值：</Text>
              <InputNumber value={newThreshold} onChange={(v) => setNewThreshold(Number(v ?? 0))} style={{ marginLeft: 8, width: 120 }} />
              <Checkbox checked={newEnabled} onChange={(e) => setNewEnabled(e.target.checked)} style={{ marginLeft: 16 }}>启用</Checkbox>
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doCompare}>
            对比版本
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="对比结果">
            <div style={{ marginBottom: 16 }}>
              <Text strong>变更字段数：</Text><Text style={{ marginLeft: 8 }}>{report.changeCount}</Text>
              <Text strong style={{ marginLeft: 24 }}>破坏性变更：</Text>
              <Tag color={report.isBreaking ? "red" : "green"} style={{ marginLeft: 8 }}>
                {report.isBreaking ? "是" : "否"}
              </Tag>
            </div>
            {result.changedFields.length > 0 && (
              <List
                dataSource={result.changedFields}
                renderItem={(item) => (
                  <List.Item>
                    <Tag color="orange">{item}</Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
