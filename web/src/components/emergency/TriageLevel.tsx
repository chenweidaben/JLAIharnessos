/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 四级分诊：分诊级别定义 / 评分系统 / AI 辅助分诊 / 分诊记录表单
 */
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Input,
  InputNumber,
  message,
  Row,
  Segmented,
  Slider,
  Space,
  Steps,
  Tag,
} from 'antd';
import {
  AimOutlined,
  ArrowLeftOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  RobotOutlined,
  SafetyCertificateOutlined,
} from '@ant-design/icons';
import clsx from 'clsx';

import { buildAiAdvice } from '@/mock/emergencyMock';
import { useEmergencyStore } from '@/store/emergencyStore';
import type { TriageLevel, TriagePatient, Vitals } from '@/types/emergency';
import { clickableProps } from '@/utils/a11y';
import { LEVEL_META } from './constants';

const { TextArea } = Input;

function LevelCard({
  level,
  active,
  onClick,
}: {
  level: TriageLevel;
  active: boolean;
  onClick: () => void;
}) {
  const meta = LEVEL_META[level];
  return (
    <div
      {...clickableProps(onClick)}
      className="cursor-pointer rounded-jl border-2 p-3 transition-all"
      style={{
        borderColor: active ? meta.color : '#E8ECF1',
        background: active ? meta.bg : '#fff',
      }}
    >
      <div className="flex items-center gap-2">
        <span
          className="flex h-7 w-7 items-center justify-center rounded-md text-sm font-bold text-white"
          style={{ background: meta.color }}
        >
          {meta.short}
        </span>
        <span className="font-semibold text-ink-primary">{meta.label}</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{meta.desc}</p>
      <div className="mt-1 text-xs" style={{ color: meta.color }}>
        {level === 1 ? '响应：立即' : `响应：${meta.targetWait}分钟内`}
      </div>
    </div>
  );
}

export default function TriageLevel({ patient }: { patient: TriagePatient }) {
  const navigate = useNavigate();
  const { triageRecord, triageHistory, saveTriage } = useEmergencyStore();

  const [complaint, setComplaint] = useState(patient.chiefComplaint);
  const [vitals, setVitals] = useState<Vitals>({ ...patient.vitals });
  const [painScore, setPainScore] = useState(patient.vitals.painScore ?? 0);
  const [allergies, setAllergies] = useState(patient.allergyHistory.join('、'));
  const [past, setPast] = useState(patient.pastHistory);
  const [meds, setMeds] = useState(patient.medicationHistory);
  const [level, setLevel] = useState<TriageLevel>(
    triageRecord?.level ?? buildAiAdvice(patient.chiefComplaint, patient.vitals).suggestedLevel,
  );
  const [basis, setBasis] = useState('');
  const [nurseName, setNurseName] = useState(triageRecord?.nurseName ?? '王*慧');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLevel(
      triageRecord?.level ?? buildAiAdvice(patient.chiefComplaint, patient.vitals).suggestedLevel,
    );
  }, [triageRecord, patient.chiefComplaint, patient.vitals]);

  // 实时 AI 建议（基于当前主诉与生命体征）
  const ai = useMemo(
    () => buildAiAdvice(complaint, { ...vitals, painScore }),
    [complaint, vitals, painScore],
  );

  // 评分
  const vitalScore = useMemo(() => {
    let s = 4;
    if (vitals.spo2 != null && vitals.spo2 < 90) s += 12;
    else if (vitals.spo2 != null && vitals.spo2 < 94) s += 6;
    if (vitals.systolic != null && vitals.systolic < 90) s += 12;
    if (vitals.temperature != null && vitals.temperature >= 39) s += 3;
    if (vitals.consciousness === 'unresponsive' || vitals.consciousness === 'pain') s += 14;
    else if (vitals.consciousness === 'verbal') s += 8;
    return s;
  }, [vitals]);

  const complaintScore =
    ai.suggestedLevel === 1 ? 35 : ai.suggestedLevel === 2 ? 28 : ai.suggestedLevel === 3 ? 16 : 6;
  const painBonus = painScore >= 7 ? 6 : painScore >= 4 ? 3 : 0;
  const totalScore = vitalScore + complaintScore + painBonus;

  const setV = (k: keyof Vitals) => (val: string | number | null) => {
    const n = val === '' || val == null ? undefined : Number(val);
    setVitals((prev) => ({ ...prev, [k]: n }));
  };

  const handleSave = async () => {
    if (!triageRecord) return;
    // 医疗合规：分诊记录必须有责任护士签名确认，禁止空签名提交
    if (!nurseName.trim()) {
      message.warning('请填写分诊护士签名后再提交，分诊记录须责任护士签名确认');
      return;
    }
    await saveTriage({
      ...triageRecord,
      chiefComplaint: complaint,
      vitals: { ...vitals, painScore, measureTime: new Date().toISOString() },
      allergyHistory: allergies
        .split(/[、,，]/)
        .map((s) => s.trim())
        .filter(Boolean),
      pastHistory: past,
      medicationHistory: meds,
      painScore,
      level,
      basis:
        basis ||
        `综合评分${totalScore}分，AI建议${LEVEL_META[ai.suggestedLevel].label}，护士确认为${LEVEL_META[level].label}`,
      nurseName,
      vitalScore,
      complaintScore,
      totalScore,
      confirmed: true,
    });
    setSaved(true);
  };

  const meta = LEVEL_META[level];

  return (
    <div className="space-y-4">
      {/* 患者信息条 */}
      <Card className="shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/emergency')}>
              返回分诊台
            </Button>
            <div>
              <span className="text-lg font-semibold text-ink-primary">{patient.name}</span>
              <span className="ml-2 text-sm text-ink-secondary">
                {patient.gender === 'male' ? '男' : '女'} · {patient.age}岁 · {patient.visitNo}
              </span>
            </div>
          </div>
          <Tag color={meta.color} className="mr-0 text-base">
            当前确认：{meta.label}
          </Tag>
        </div>
      </Card>

      <Row gutter={[16, 16]}>
        {/* 左：级别定义 + 评分 + AI */}
        <Col xs={24} lg={12}>
          <Card title="四级分诊标准" className="mb-4 shadow-card">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {([1, 2, 3, 4] as TriageLevel[]).map((lv) => (
                <LevelCard key={lv} level={lv} active={level === lv} onClick={() => setLevel(lv)} />
              ))}
            </div>
          </Card>

          <Card
            title={
              <>
                {' '}
                <AimOutlined /> 分诊评分与AI辅助
              </>
            }
            className="shadow-card"
          >
            <div className="mb-3 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-jl-primary/5 p-3">
                <div className="text-xs text-ink-secondary">生命体征评分</div>
                <div className="text-xl font-bold text-jl-primary">{vitalScore}</div>
              </div>
              <div className="rounded-lg bg-jl-primary/5 p-3">
                <div className="text-xs text-ink-secondary">主诉评分</div>
                <div className="text-xl font-bold text-jl-primary">{complaintScore}</div>
              </div>
              <div className="rounded-lg p-3" style={{ background: meta.bg }}>
                <div className="text-xs text-ink-secondary">综合评分</div>
                <div className="text-xl font-bold" style={{ color: meta.color }}>
                  {totalScore}
                </div>
              </div>
            </div>

            <Alert
              type="warning"
              showIcon
              icon={<RobotOutlined />}
              message={`AI建议分诊级别：${LEVEL_META[ai.suggestedLevel].label}（仅供参考，需护士确认）`}
              className="mb-3"
            />

            <div className="space-y-3">
              <div>
                <div className="mb-1 flex items-center gap-1 text-sm font-medium text-ink-primary">
                  <SafetyCertificateOutlined style={{ color: '#F5222D' }} /> 需立即处理
                </div>
                <ul className="ml-5 list-disc text-xs text-ink-secondary">
                  {ai.immediateActions.map((a, i) => (
                    <li key={i}>{a}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-1 flex items-center gap-1 text-sm font-medium text-ink-primary">
                  <BulbOutlined style={{ color: '#FAAD14' }} /> 鉴别诊断建议
                </div>
                <Space wrap>
                  {ai.differentialDx.map((d, i) => (
                    <Tag key={i}>{d}</Tag>
                  ))}
                </Space>
              </div>
              <div>
                <div className="mb-1 text-sm font-medium text-ink-primary">必要检查建议</div>
                <Space wrap>
                  {ai.suggestedExams.map((e, i) => (
                    <Tag key={i} color="blue">
                      {e}
                    </Tag>
                  ))}
                </Space>
              </div>
            </div>
          </Card>
        </Col>

        {/* 右：分诊记录表单 */}
        <Col xs={24} lg={12}>
          <Card title="分诊记录" className="shadow-card">
            <div className="space-y-3">
              <div>
                <div className="mb-1 text-xs text-ink-secondary">主诉</div>
                <Input value={complaint} onChange={(e) => setComplaint(e.target.value)} />
              </div>

              <div>
                <div className="mb-2 text-xs text-ink-secondary">生命体征（异常项红色）</div>
                <Row gutter={[8, 8]}>
                  {(
                    [
                      ['temperature', '体温 ℃'],
                      ['pulse', '脉搏'],
                      ['respiration', '呼吸'],
                      ['spo2', 'SpO₂ %'],
                    ] as Array<[keyof Vitals, string]>
                  ).map(([k, label]) => (
                    <Col span={6} key={k}>
                      <div className="text-xs text-ink-secondary">{label}</div>
                      <InputNumber
                        size="small"
                        style={{ width: '100%' }}
                        value={vitals[k]}
                        onChange={setV(k)}
                      />
                    </Col>
                  ))}
                  <Col span={12}>
                    <div className="text-xs text-ink-secondary">血压 (收缩压/舒张压 mmHg)</div>
                    <Space.Compact style={{ width: '100%' }}>
                      <InputNumber
                        size="small"
                        style={{ width: '50%' }}
                        value={vitals.systolic}
                        onChange={setV('systolic')}
                      />
                      <InputNumber
                        size="small"
                        style={{ width: '50%' }}
                        value={vitals.diastolic}
                        onChange={setV('diastolic')}
                      />
                    </Space.Compact>
                  </Col>
                  <Col span={12}>
                    <div className="text-xs text-ink-secondary">意识</div>
                    <Segmented
                      block
                      size="small"
                      value={vitals.consciousness ?? 'alert'}
                      onChange={(v) =>
                        setVitals((p) => ({ ...p, consciousness: v as Vitals['consciousness'] }))
                      }
                      options={[
                        { label: '清醒', value: 'alert' },
                        { label: '声音', value: 'verbal' },
                        { label: '疼痛', value: 'pain' },
                        { label: '无反应', value: 'unresponsive' },
                      ]}
                    />
                  </Col>
                </Row>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between text-xs text-ink-secondary">
                  <span>疼痛评分 NRS</span>
                  <span
                    className="font-semibold"
                    style={{ color: painScore >= 7 ? '#F5222D' : '#262626' }}
                  >
                    {painScore} 分
                  </span>
                </div>
                <Slider
                  min={0}
                  max={10}
                  value={painScore}
                  onChange={setPainScore}
                  marks={{ 0: '无痛', 4: '轻', 7: '重', 10: '剧痛' }}
                />
              </div>

              <Row gutter={8}>
                <Col span={24}>
                  <div className="text-xs text-ink-secondary">过敏史</div>
                  <Input value={allergies} onChange={(e) => setAllergies(e.target.value)} />
                </Col>
              </Row>
              <Row gutter={8}>
                <Col span={12}>
                  <div className="text-xs text-ink-secondary">既往史</div>
                  <Input value={past} onChange={(e) => setPast(e.target.value)} />
                </Col>
                <Col span={12}>
                  <div className="text-xs text-ink-secondary">用药史</div>
                  <Input value={meds} onChange={(e) => setMeds(e.target.value)} />
                </Col>
              </Row>

              <div>
                <div className="mb-1 text-xs text-ink-secondary">分诊级别（护士确认/修改）</div>
                <Segmented
                  block
                  value={level}
                  onChange={(v) => setLevel(v as TriageLevel)}
                  options={([1, 2, 3, 4] as TriageLevel[]).map((lv) => ({
                    label: LEVEL_META[lv].label,
                    value: lv,
                  }))}
                />
              </div>

              <div>
                <div className="text-xs text-ink-secondary">分诊依据</div>
                <TextArea
                  rows={2}
                  value={basis}
                  onChange={(e) => setBasis(e.target.value)}
                  placeholder="可不填，默认根据综合评分自动生成"
                />
              </div>

              <div>
                <div className="mb-1 text-xs text-ink-secondary">
                  <span className="text-red-500">*</span> 分诊护士签名
                </div>
                <Input
                  value={nurseName}
                  onChange={(e) => setNurseName(e.target.value)}
                  placeholder="必填，责任护士签名"
                  maxLength={20}
                />
              </div>

              <Divider style={{ margin: '12px 0' }} />

              <div className="flex items-center justify-between">
                {saved ? (
                  <span className="flex items-center gap-1 text-medical-normal">
                    <CheckCircleOutlined /> 分诊已确认并提交
                  </span>
                ) : (
                  <span className="text-xs text-ink-secondary">
                    提交后患者进入候诊队列并按级别排序
                  </span>
                )}
                <Space>
                  <Button onClick={() => navigate('/emergency')}>取消</Button>
                  <Button
                    type="primary"
                    onClick={handleSave}
                    className={clsx(saved && 'opacity-60')}
                  >
                    {saved ? '已提交' : '确认分诊'}
                  </Button>
                </Space>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* 分诊历史 */}
      <Card title="今日分诊记录" className="shadow-card" size="small">
        <Steps
          direction="vertical"
          size="small"
          current={triageRecord ? 1 : 0}
          items={triageHistory.slice(0, 3).map((r) => ({
            title: `${r.patientId} · ${LEVEL_META[r.level].label}`,
            description: `${r.chiefComplaint} —— 护士 ${r.nurseName}（综合评分 ${r.totalScore}）`,
          }))}
        />
      </Card>
    </div>
  );
}
