/**
 * 体检异常转诊纯函数（M40-B）。
 */

export function mapFinding(item: string): string {
  const s = item.toLowerCase();
  if (s.includes('blood_pressure') || s.includes('hypertension') || s.includes('血压') || s.includes('高血压')) return '心血管内科';
  if (s.includes('glucose') || s.includes('diabetes') || s.includes('血糖') || s.includes('糖尿病')) return '内分泌科';
  if (s.includes('lipid') || s.includes('cholesterol') || s.includes('血脂')) return '心血管内科';
  if (s.includes('nodule') || s.includes('lung') || s.includes('结节') || s.includes('肺结节')) return '胸外科';
  return '全科';
}

export function severity(item: string): 'low' | 'medium' | 'high' {
  const s = item.toLowerCase();
  if (s.includes('critical') || s.includes('severe') || s.includes('危急')) return 'high';
  if (s.includes('abnormal') || s.includes('elevated') || s.includes('高') || s.includes('异常')) return 'medium';
  return 'low';
}
