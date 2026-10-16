/**
 * 健澜科技 jlmedaios - 住培教学考核 OSCE V5 页（M269-D）
 *
 * 住培基地（专业基地/轮转/师资/学员/招收/结业/合格率）/教学活动（教学查房/病例讨论/小讲课/操作示范/登记/督导）/OSCE考核（考站/SP标准化病人/考表/评分/反馈/多站式）/过程考核（出科/月度/年度/理论/技能/平时成绩/档案）/师资队伍（带教师资/师资培训/教学能力/教学比赛/激励）/学员管理（考勤/医德/心理/岗位胜任力/导师/投诉）/教学质量（学生评教/同行评教/结业通过率/就业率/整改）/教学指标（教学活动完成率/OSCE通过率/结业考核/满意度）。深海蓝 VI。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import {
  Card,
  Col,
  Layout,
  List,
  Row,
  Spin,
  Statistic,
  Table,
  Typography,
} from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph, Text } = Typography;

const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  timeRange: string;
  residencyBase: { specialty: number; rotation: number; faculty: number; trainee: number; recruitment: number; graduation: number; passRate: number };
  teaching: { rounds: number; caseDiscussion: number; lecture: number; skillsDemo: number; log: number; supervision: number };
  osce: { stations: number; sp: number; checklist: number; scoring: number; feedback: number; multistation: number };
  process: { rotationOut: number; monthly: number; yearly: number; theory: number; skill: number; daily: number; archive: number };
  faculty: { preceptor: number; training: number; teachingAbility: number; competition: number; motivation: number };
  trainee: { attendance: number; ethics: number; psychology: number; competency: number; mentor: number; complaint: number };
  quality: { studentEval: number; peerEval: number; graduationPass: number; employment: number; remediation: number };
  metrics: { activityCompletion: number; oscePass: number; graduationExam: number; satisfaction: number };
  suggestions: string[];
}

export default function ResidencyEducationV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      try {
        const resp = await get<Result>("/api/v1/residency-edu-v5/report");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>住培教学考核 OSCE V5</Title>
        <Paragraph type="secondary">住培基地·专业基地·轮转·师资·学员·招收·结业·合格率 / 教学活动·教学查房·病例讨论·小讲课·操作示范·登记·督导 / OSCE考核·考站·SP标准化病人·考表·评分·反馈·多站式</Paragraph>

        {loading && <Spin size="large" style={{ padding: 48 }} />}

        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="教学完成率" value={`${data.metrics.activityCompletion}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="OSCE通过率" value={`${data.metrics.oscePass}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="结业考核" value={`${data.metrics.graduationExam}%`} /></Card></Col>
              <Col span={6}><Card><Statistic title="满意度" value={`${data.metrics.satisfaction}%`} /></Card></Col>
            </Row>

            <Card title={<Text strong style={{ color: VI.deep }}>教学明细</Text>} style={{ marginBottom: 16 }}>
              <Table
                rowKey="key"
                size="small"
                pagination={false}
                dataSource={[
                  { key: "base", name: "在培学员", value: data.residencyBase.trainee },
                  { key: "faculty", name: "带教师资", value: data.residencyBase.faculty },
                  { key: "osce", name: "OSCE考站", value: data.osce.stations },
                  { key: "teaching", name: "教学查房", value: data.teaching.rounds },
                ]}
                columns={[
                  { title: "项目", dataIndex: "name", key: "name" },
                  { title: "数值", dataIndex: "value", key: "value" },
                ]}
              />
            </Card>

            <Card title={<Text strong style={{ color: VI.deep }}>改进建议</Text>}>
              <List
                size="small"
                dataSource={data.suggestions}
                renderItem={(s) => <List.Item><Text>{s}</Text></List.Item>}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
