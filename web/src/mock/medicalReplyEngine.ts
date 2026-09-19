/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 演示用医疗场景回复引擎（离线、确定性、无幻觉）
 *
 * 在未接入真实大模型（VITE_MOCK_ENABLED=true）时，为 AI 问诊提供
 * 专业、结构化、符合临床常识的场景化回复：识别指标与数值、按权威阈值
 * 判定危急值、给出"风险判定 → 即刻处置 → 监测检查 → 医嘱建议 → 上报复核
 * → 免责声明"的闭环建议。
 *
 * 红线：所有输出均为临床辅助参考，不能替代医生面诊与诊断；危急值强制
 * 提示立即处置与人工复核。生产环境应切换到后端 Agent + DeepSeek + RAG/CDS。
 */

/** 数值 + 单位抽取结果 */
interface NumberHit {
  value: number;
  unit: string;
  index: number;
  raw: string;
}

/** 从文本中抽取某指标附近的第一个数值（含 mmol/L、mg/dL、%、℃、mmHg、次/分等） */
function findNumberNear(text: string, keywords: string[]): NumberHit | null {
  for (const kw of keywords) {
    const ki = text.indexOf(kw);
    if (ki < 0) continue;
    // 在指标词前后 16 个字符窗口内找数字
    const window = text.slice(Math.max(0, ki - 4), ki + 16);
    const m = window.match(/(\d+(?:\.\d+)?)\s*(mmol\/l|mg\/dl|g\/l|%|℃|°c|mmhg|次\/分|bpm|ug\/l|ng\/ml|umol\/l|μmol\/l|mol\/l|x10\^?\d*\/?l?|万)?/i);
    if (m && m[1]) {
      return {
        value: Number(m[1]),
        unit: (m[2] || '').toLowerCase(),
        index: ki,
        raw: m[0].trim(),
      };
    }
  }
  return null;
}

const has = (t: string, ...keys: string[]) => keys.some((k) => t.includes(k));

/** 危急值统一处置尾注 + 免责声明 */
function footer(critical: boolean): string {
  const base =
    '\n\n— — —\n⚠️ 以上为智能体基于临床指南的辅助建议，不能替代医生面诊与诊断，最终诊疗决策由经治医师负责。';
  return critical
    ? `\n\n🔴 **该结果已达危急值，建议立即启动危急值处理流程（10 分钟内处置 + 双人复核 + 系统登记上报），不得仅依据本提示观察等待。**${base}`
    : base;
}

/** 结构化段落拼装 */
function compose(parts: Array<[string, string[] | string]>): string {
  return parts
    .map(([title, body]) => {
      if (Array.isArray(body)) return `**${title}**\n${body.map((b, i) => `${i + 1}. ${b}`).join('\n')}`;
      return `**${title}**\n${body}`;
    })
    .join('\n\n');
}

// ============================================================================
// 各指标/场景判定
// ============================================================================

/** 血钾（高钾/低钾） */
function potassium(text: string): string | null {
  const hit = findNumberNear(text, ['血钾', '钾离子', 'k+', 'K ', '钾']);
  if (!hit) return null;
  const k = hit.value;
  if (k >= 6.5) {
    return (
      `🔴 **危急值：严重高钾血症（血钾 ${k} mmol/L，≥6.5）**，可诱发室性心动过速、室颤甚至心搏骤停，须按急症立即处理。\n\n` +
      compose([
        ['即刻处置（按"稳膜—转移—排出—去除病因"顺序）', [
          '立即停止一切补钾及升钾药物（氯化钾、ACEI/ARB、螺内酯、氨苯蝶啶、NSAIDs 等）',
          '10% 葡萄糖酸钙 10～20mL 缓慢静脉推注（5～10 分钟），稳定心肌细胞膜，必要时 5 分钟后重复',
          '短效胰岛素 6～10U + 50% 葡萄糖 50mL 静推（或 10% 葡萄糖 500mL+胰岛素），促进钾向细胞内转移',
          '雾化吸入沙丁胺醇 10～20mg；5% 碳酸氢钠 100～250mL 静滴（合并酸中毒时）',
          '促进排钾：呋塞米利尿（容量充足/有尿者）；口服/灌肠降钾树脂（聚苯乙烯磺酸钠或环硅酸锆钠）',
          '严重高钾或无尿/肾衰竭：立即请肾内科会诊，紧急血液透析',
        ]],
        ['监测与检查', [
          '持续心电监护，关注 T 波高尖、PR/QRS 增宽等改变',
          '即刻复查血钾、血气、肾功能（肌酐/尿素）、血糖，每 1～2 小时复查至安全范围',
          '核查标本是否溶血（假性高钾），必要时重新采血确认',
        ]],
        ['上报与复核', ['按危急值 10 分钟内报告经治/值班医师，双人核对结果并在系统登记，记录处置与复查时间。']],
      ]) + footer(true)
    );
  }
  if (k >= 5.5) {
    return (
      `🟠 **高钾血症（血钾 ${k} mmol/L，5.5～6.4）**，存在心律失常风险。\n\n` +
      compose([
        ['即刻处置', [
          '暂停补钾及 ACEI/ARB、螺内酯、NSAIDs 等升钾药物并评估',
          '复查血钾 + 肾功能 + 心电图，排除标本溶血所致假性升高',
          '促进钾向细胞内转移（胰岛素+葡萄糖、雾化沙丁胺醇），必要时利尿/降钾树脂',
          '肾功能不全或进行性升高请肾内科会诊',
        ]],
        ['监测', ['心电监护，2～4 小时复查血钾直至回落；记录 24 小时出入量。']],
      ]) + footer(false)
    );
  }
  if (k < 2.5) {
    return (
      `🔴 **危急值：严重低钾血症（血钾 ${k} mmol/L，<2.5）**，可致肌无力、横纹肌溶解、恶性心律失常。\n\n` +
      compose([
        ['即刻处置', [
          '持续心电监护，评估肌无力/呼吸肌受累',
          '建立静脉通路，在心电监护下静脉补钾（浓度一般≤40mmol/L、速度≤10～20mmol/h），同时口服补钾',
          '纠正合并的低镁（低镁不纠正低钾难纠正），评估酸碱状态',
          '查找病因（利尿剂、腹泻、呕吐、醛固酮增多等）',
        ]],
        ['监测', ['每 2～4 小时复查血钾、镁、肾功能及心电图，记录尿量。']],
        ['上报与复核', ['按危急值流程报告并双人复核登记。']],
      ]) + footer(true)
    );
  }
  if (k < 3.5) {
    return (
      `🟡 **低钾血症（血钾 ${k} mmol/L，3.0～3.4 为轻度）**。\n\n` +
      compose([
        ['处置建议', [
          '口服补钾为主（氯化钾缓释片），症状明显或不能口服者静脉补钾（见尿补钾、控制浓度速度）',
          '同时评估并纠正低镁；复查血钾、心电图',
          '排查利尿剂、呕吐/腹泻、摄入不足等诱因',
        ]],
      ]) + footer(false)
    );
  }
  return `血钾 ${k} mmol/L 在正常参考范围（3.5～5.5）。建议结合临床表现、肾功能与用药综合判断。${footer(false)}`;
}

/** 血糖 */
function glucose(text: string): string | null {
  const hit = findNumberNear(text, ['血糖', '葡萄糖', 'glu']);
  if (!hit) return null;
  const g = hit.value;
  if (g < 2.8) {
    return (
      `🔴 **危急值：严重低血糖（血糖 ${g} mmol/L，<2.8）**，可致昏迷、抽搐、脑损伤。\n\n` +
      compose([
        ['即刻处置', [
          '意识清醒者：立即口服 15～20g 速效糖（葡萄糖片/糖水/糖果），15 分钟后复测，"15-15 原则"',
          '意识障碍/不能口服：立即 50% 葡萄糖 40～60mL 静脉推注，继以 10% 葡萄糖维持；或胰高血糖素肌注',
          '神志转清后补充碳水化合物，防止再次低血糖',
          '排查诱因（降糖药/胰岛素过量、进食不足、肝肾功能不全），暂停相关降糖药并复核剂量',
        ]],
        ['监测上报', ['每 15～30 分钟复测血糖至稳定，持续心电/意识监护；按危急值上报登记。']],
      ]) + footer(true)
    );
  }
  if (g < 3.9) {
    return `🟡 **低血糖（血糖 ${g} mmol/L，<3.9）**。立即口服 15g 速效糖，15 分钟复测；反复发生需复核降糖方案，警惕无症状低血糖。${footer(false)}`;
  }
  if (g >= 33.3) {
    return (
      `🔴 **危急值：血糖 ${g} mmol/L（≥33.3）**，高度警惕高渗高血糖状态/糖尿病酮症酸中毒。\n\n` +
      compose([
        ['即刻处置', ['立即查血气、血酮/尿酮、电解质、肾功能、血浆渗透压', '补液、小剂量胰岛素静脉泵入、纠正电解质（先补钾），内分泌科急会诊', '心电监护、记录出入量，按危急值上报']],
      ]) + footer(true)
    );
  }
  if (g >= 16.7) {
    return `🟠 **血糖显著升高（${g} mmol/L）**，警惕酮症/高渗。建议查血气、血酮、电解质与肾功能，评估脱水与诱因（感染/停药），按方案补液并胰岛素治疗，内分泌科会诊。${footer(false)}`;
  }
  if (g >= 11.1) {
    return `🟡 血糖 ${g} mmol/L 升高（随机≥11.1 需考虑糖尿病）。建议结合空腹血糖、糖化血红蛋白（HbA1c）与 OGTT 明确，评估症状（多饮多尿体重下降）。${footer(false)}`;
  }
  return `血糖 ${g} mmol/L 未见明显异常（空腹正常 3.9～6.1，随机<11.1）。${footer(false)}`;
}

/** 血氧/呼吸 */
function oxygen(text: string): string | null {
  const hit = findNumberNear(text, ['血氧', '氧饱和', 'spo2', 'SpO2', 'saO2']);
  if (!hit) return null;
  const s = hit.value;
  if (s < 90) {
    return (
      `🔴 **危急值：严重低氧血症（SpO₂ ${s}%，<90%）**。\n\n` +
      compose([
        ['即刻处置', ['立即评估气道、呼吸、循环（ABC）', '鼻导管/面罩吸氧，必要时高流量氧疗（HFNC）、无创通气，呼吸衰竭者气管插管', '查动脉血气、心电图、胸部影像，明确病因（肺炎/心衰/COPD/肺栓塞/气胸）', '持续心电血氧监护，呼吸科/ICU 急会诊，按危急值上报']],
      ]) + footer(true)
    );
  }
  if (s < 94) {
    return `🟡 血氧 ${s}% 偏低（94%～95% 为临界）。建议吸氧、评估呼吸状态，查血气与胸部影像，动态监测；COPD 等慢性患者目标范围需个体化。${footer(false)}`;
  }
  return `血氧 ${s}% 在正常范围（≥95%）。${footer(false)}`;
}

/** 血压 */
function bloodPressure(text: string): string | null {
  // 单位 mmHg 可选（临床常写作"血压 190/125"），但必须有"血压/mmhg"上下文，避免误判其他比值
  const lower = text.toLowerCase();
  const hasBpContext = text.includes('血压') || lower.includes('mmhg');
  const m = text.match(/(\d{2,3})\s*[/／]\s*(\d{2,3})(?:\s*mmhg)?/i);
  if (!m || !hasBpContext) return null;
  const sys = Number(m[1]);
  const dia = Number(m[2]);
  // 合理性过滤，排除把其他分数/比值误判为血压
  if (sys < 60 || sys > 260 || dia < 30 || dia > 180) return null;
  if (sys >= 180 || dia >= 120) {
    return `🔴 **高血压急症/亚急症（${sys}/${dia} mmHg）**。立即安静休息、复测双侧血压、心电监护；若伴胸痛、呼吸困难、神经功能缺损、意识改变或急性靶器官损害，按高血压急症处理（静脉降压，第 1 小时降幅不超过 25%），急诊/ICU 会诊并按危急值上报；无症状者尽快口服控制性降压并排查诱因。${footer(true)}`;
  }
  if (sys < 90 || dia < 60) {
    return `🟠 **血压偏低（${sys}/${dia} mmHg）**。立即评估意识、心率、皮肤灌注与尿量，排查休克/失血/感染/心源性病因，建立静脉通路补液，持续监护，必要时血管活性药物并急诊处理。${footer(false)}`;
  }
  return `血压 ${sys}/${dia} mmHg 未见急性危险。建议按高血压分级规范管理、家庭监测并结合靶器官评估。${footer(false)}`;
}

/** 心率/心律 */
function heartRate(text: string): string | null {
  const hit = findNumberNear(text, ['心率', '脉搏', '心室率', 'HR']);
  if (!hit) return null;
  const hr = hit.value;
  if (hr > 130) {
    return `🔴 **显著心动过速（心率 ${hr} 次/分，>130）**。立即心电图明确心律（窦速/室上速/房颤/室速），评估血压、意识与灌注；血流动力学不稳定（低血压、胸痛、心衰、意识改变）者立即同步电复律并急诊处理，稳定者针对病因（感染、失血、缺氧、甲亢、药物）治疗，持续监护并上报。${footer(true)}`;
  }
  if (hr > 100) return `🟡 心动过速（${hr} 次/分）。建议心电图明确节律，排查发热、贫血、缺氧、脱水、甲亢、药物等诱因，对症处理。${footer(false)}`;
  if (hr < 50) {
    return `🟠 **心动过缓（心率 ${hr} 次/分，<50）**。评估有无头晕、黑矇、晕厥、低血压；心电图识别传导阻滞，停用减慢心率药物（β受体阻滞剂、洋地黄等），有症状者阿托品/起搏支持，持续监护，必要时急诊/心内科会诊。${footer(false)}`;
  }
  return `心率 ${hr} 次/分在正常范围（60～100）。${footer(false)}`;
}

/** 体温/发热 */
function temperature(text: string): string | null {
  const hit = findNumberNear(text, ['体温', '发热', '发烧']);
  if (!hit) return null;
  const t = hit.value;
  if (t >= 41) return `🔴 **超高热（${t}℃）**，可致中枢神经系统损伤。立即物理+药物降温、补液、持续监护，紧急查找病因（重症感染/中暑/药物热），急诊处理并上报。${footer(true)}`;
  if (t >= 39.1) return `🟠 **高热（${t}℃）**。结合热型与伴随症状完善血常规、CRP/PCT、血培养及感染部位检查；经验性抗感染需结合病情与指南，物理/药物退热、补液，警惕脓毒症。${footer(false)}`;
  if (t >= 37.4) return `🟡 发热（${t}℃，低热 37.4～38）。建议结合病程、伴随症状与流行病学史评估，必要时查血常规、CRP 等感染指标，对因治疗。${footer(false)}`;
  if (t <= 35) return `🔴 **低体温（${t}℃）**，警惕休克、甲减危象、环境低温，立即保温并评估生命体征，急诊处理。${footer(true)}`;
  return `体温 ${t}℃ 正常。${footer(false)}`;
}

/** 血常规：白细胞/血红蛋白/血小板 */
function cbc(text: string): string | null {
  if (has(text, '白细胞', 'wbc', 'WBC')) {
    const hit = findNumberNear(text, ['白细胞', 'wbc', 'WBC']);
    if (hit) {
      const v = hit.value;
      if (v >= 30) return `🔴 **白细胞显著升高（${v}×10⁹/L，≥30）**，高度警惕重症感染/白血病。立即复查、外周血涂片、CRP/PCT、血培养，评估脓毒症，血液科/感染科会诊并上报。${footer(true)}`;
      if (v >= 10) return `🟡 白细胞升高（${v}×10⁹/L），常见于细菌感染、应激等。建议结合中性粒细胞比例、CRP/PCT 与感染灶判断。${footer(false)}`;
      if (v < 2) return `🔴 **粒细胞缺乏风险（白细胞 ${v}×10⁹/L，<2）**。立即查中性粒细胞绝对值（ANC），保护性隔离、停用可疑药物、复查并血液科会诊，发热时按粒缺发热急诊处理。${footer(true)}`;
      if (v < 4) return `🟡 白细胞偏低（${v}×10⁹/L）。建议复查并查中性粒细胞绝对值，排查病毒感染、药物、骨髓抑制等。${footer(false)}`;
    }
  }
  if (has(text, '血红蛋白', '血色素', 'hb', '贫血')) {
    const hit = findNumberNear(text, ['血红蛋白', '血色素', 'hb', 'Hb']);
    if (hit) {
      const v = hit.value;
      if (v < 60) return `🔴 **极重度贫血（Hb ${v} g/L，<60）**。立即评估有无活动性出血与缺氧表现，配血、必要时紧急输血，查找病因，持续监护并上报。${footer(true)}`;
      if (v < 90) return `🟠 中重度贫血（Hb ${v} g/L）。建议查铁代谢、网织红细胞、便潜血等明确病因，评估输血指征与失血情况。${footer(false)}`;
      if (v < 115) return `🟡 轻度贫血（Hb ${v} g/L）。建议结合 MCV/MCH 与铁代谢指标查明原因（缺铁性/巨幼/慢性病性等）。${footer(false)}`;
    }
  }
  if (has(text, '血小板', 'plt', 'PLT')) {
    const hit = findNumberNear(text, ['血小板', 'plt', 'PLT']);
    if (hit) {
      const v = hit.value;
      if (v < 30) return `🔴 **血小板重度减少（${v}×10⁹/L，<30，自发出血风险高）**。避免肌注/硬食，复查并查外周血涂片，警惕 ITP/DIC/药物/血液病，血液科急会诊，有出血按危急值处理。${footer(true)}`;
      if (v < 100) return `🟡 血小板减少（${v}×10⁹/L）。建议复查、查因（感染、药物、肝病、ITP 等），有创操作前评估出血风险。${footer(false)}`;
    }
  }
  return null;
}

/** 胸痛/肌钙蛋白（ACS） */
function chestPain(text: string): string | null {
  if (!has(text, '胸痛', '胸闷', '心绞痛', '心梗', '心肌梗死', '肌钙蛋白', 'tni', 'cTn')) return null;
  return (
    '🟠 **急性胸痛需首先排除急性冠脉综合征（ACS）/主动脉夹层/肺栓塞/气胸等致死性病因。**\n\n' +
    compose([
      ['即刻处置（10 分钟内）', [
        '卧床、心电血压血氧监护、吸氧（低氧时）、建立静脉通路',
        '10 分钟内完成 12 导联心电图，必要时加做/动态复查；20 分钟内送检肌钙蛋白（cTn）并动态复查',
        '可疑 ACS：阿司匹林 300mg 嚼服（无禁忌）+ P2Y12 抑制剂、抗凝，按胸痛中心流程激活导管室',
        '含服硝酸甘油（注意血压/右室梗死禁忌），镇痛、控制心率血压',
      ]],
      ['鉴别与检查', ['查 D-二聚体、BNP、电解质、肾功能；必要时胸部 CTA 排除夹层/肺栓塞，床旁超声、胸片']],
      ['上报', ['时间就是心肌，立即通知心内科/急诊二线，按时间节点记录并启动绿色通道。']],
    ]) + footer(true)
  );
}

/** 卒中 FAST */
function stroke(text: string): string | null {
  if (!has(text, '偏瘫', '口角歪斜', '言语不清', '中风', '卒中', '脑梗', '脑出血', '肢体无力', '面瘫')) return null;
  return (
    '🔴 **疑似急性脑卒中**，救治高度时间依赖。\n\n' +
    compose([
      ['即刻处置', [
        '按 FAST（面、臂、语、时）快速识别并记录最后正常时间（发病时间）',
        '立即呼叫卒中团队/急诊，保持气道、生命体征监护，避免盲目降压/喂药喂水',
        '尽快头颅 CT 平扫区分缺血/出血，查血糖、凝血、心电图',
        '缺血性卒中在时间窗内（静脉溶栓 4.5h、取栓 6～24h）评估再灌注治疗，启动绿色通道',
      ]],
      ['上报', ['按危急/急诊流程处置，分秒必争，记录各时间节点。']],
    ]) + footer(true)
  );
}

/** 用药/处方相关：路由到处方审核智能体能力 */
function medication(text: string): string | null {
  if (!has(text, '药物相互作用', '配伍', '过敏', '处方审核', '用药', '剂量', '能不能一起吃', '联用', '重复用药')) return null;
  return (
    '💊 **合理用药审核**建议调用「智能处方审核」智能体进行六维预审（异常主注、配伍、剂量、过敏史、重复用药、特殊人群）。\n\n' +
    compose([
      ['系统将自动核查', [
        '药物相互作用与配伍禁忌（如头孢类+酒精双硫仑反应、喹诺酮+QT 延长药）',
        '剂量/疗程/给药途径是否超说明书，肝肾功能调整',
        '患者过敏史、妊娠/儿童/老年等特殊人群禁忌',
        '重复用药与重复成分（含复方制剂）',
      ]],
      ['人工在环', ['高风险药品（抗菌药、抗凝/抗血小板、麻醉精药品等）强制药师/医师双复核与 CA 签名。']],
    ]) +
    '\n\n请提供具体药品通用名、剂量、患者过敏史与肝肾功能，我可以给出更有针对性的审核意见。' +
    footer(false)
  );
}

/** 病历/质控/诊断类：路由到对应刚需智能体 */
function routingReply(text: string): string | null {
  if (has(text, '写病历', '生成病历', '病历书写', '门诊病历', '电子病历')) {
    return '📝 **AI 病历生成**：请在「门诊问诊」页选择患者后，由「AI 电子病历生成」智能体基于主诉、现病史、查体与检验检查自动生成结构化病历（支持语音转写、术语规范化），再由医生审核签名归档。您也可以直接告诉我患者姓名/ID 与主诉，我将引导生成。' + footer(false);
  }
  if (has(text, '质控', '病历质量', '首页质控', '核心制度')) {
    return '✅ **AI 病历质控**：「AI 病历质控」智能体提供内涵质控、首页质控与核心制度检查，逐条给出缺陷、依据条款与修改建议。可在「质量管理」页发起批量质控或在病历归档前实时校验。' + footer(false);
  }
  if (has(text, '诊断', '鉴别诊断', '诊断建议')) {
    return '🩺 **智能诊断辅助（CDS）**：系统将结合患者主诉、体征、检验检查与知识库做鉴别诊断并检索指南，按可能性排序列出诊断、依据与建议完善的检查。**诊断需由医师结合临床综合判断**。请提供患者 ID 或具体病情，我将调用诊断辅助能力。' + footer(false);
  }
  if (has(text, '语音')) {
    return '🎙️ **语音电子病历**：支持口述转写、医学术语规范化、剂量与数值校对，医生确认后 CA 签名归档。请在门诊/病房工作台点击麦克风开始口述（演示环境可在门诊页体验入口）。' + footer(false);
  }
  return null;
}

/** 兜底回复 */
function fallback(text: string): string {
  return (
    '您好，我是健澜数智医院智能体，可以协助您：\n\n' +
    '• **危急值判读**：直接告诉我指标和数值，例如"血钾 6.8 怎么办""血糖 2.6""血氧 88%"\n' +
    '• **急症识别**：胸痛、卒中、休克、高热等的标准化处置流程\n' +
    '• **检验解读**：血常规、电解质、血糖、血压、心率等结果分析\n' +
    '• **合理用药**：药物相互作用、剂量、过敏与特殊人群审核\n' +
    '• **病历与质控**：AI 病历生成、内涵/首页质控、诊断辅助\n\n' +
    `您刚才提到："${text.slice(0, 40)}"。请补充**患者 ID/姓名、具体指标数值或检查结果**，我将给出更有针对性的辅助建议。` +
    footer(false)
  );
}

/**
 * 生成场景化医疗回复（演示引擎主入口）
 */
export function generateMedicalReply(question: string): string {
  const text = question.trim();
  if (!text) return fallback(text);

  // 顺序：危急值指标优先 → 急症 → 血常规 → 用药 → 路由 → 兜底
  const pipelines = [potassium, glucose, oxygen, bloodPressure, heartRate, temperature, cbc, chestPain, stroke, medication, routingReply];
  for (const fn of pipelines) {
    const r = fn(text);
    if (r) return r;
  }
  return fallback(text);
}
