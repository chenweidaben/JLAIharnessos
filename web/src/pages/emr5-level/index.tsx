/**
 * 健澜科技 jlmedaios - 电子病历五级评级自评 V13 页（M323-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Resp {
  domainScores: Record<string, number>;
  overallScore: number;
  level: string;
}

const DOMAIN_LABEL: Record<string, string> = {
  dataManagement: "数据管理",
  medicalQuality: "医疗质量",
  operationManagement: "运营管理",
  dataUtilization: "数据利用",
  patientService: "患者服务",
  teachingResearch: "教学科研",
  managementDecision: "管理决策",
  security: "安全保障",
};

const LEVEL_COLOR: Record<string, string> = {
  "五级": "green",
  "四级": "blue",
  "三级": "orange",
  "未达标": "red",
};

export default function Emr5LevelPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/emr5-level");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>电子病历五级评级自评</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Statistic title="总分" value={data.overallScore} style={{ marginRight: 48 }} />
              <Tag color={LEVEL_COLOR[data.level] ?? "default"} style={{ fontSize: 14, padding: "4px 12px" }}>
                {data.level}
              </Tag>
            </Card>
            <Card title="8 域得分">
              {Object.entries(data.domainScores).map(([domain, score]) => (
                <div key={domain} style={{ marginBottom: 8 }}>
                  <span style={{ width: 100, display: "inline-block" }}>{DOMAIN_LABEL[domain] ?? domain}</span>
                  <div style={{ background: "#f0f0f0", height: 20, borderRadius: 4, display: "inline-block", width: 400, verticalAlign: "middle" }}>
                    <div style={{ background: VI.accent, height: 20, width: `${score}%`, borderRadius: 4 }} />
                  </div>
                  <span style={{ marginLeft: 8 }}>{score}</span>
                </div>
              ))}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
