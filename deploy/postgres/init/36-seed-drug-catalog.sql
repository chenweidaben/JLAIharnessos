-- ============================================================================
-- 健澜科技 jlmedaios - 药品目录种子
-- 36-seed-drug-catalog.sql
--
-- 将门诊工作台所需常用药品（含特殊管控、需皮试抗菌药）写入 clinical.drug_catalog，
-- 并初始化中心药房库存。处方开药的药品检索由此真实落库，不再使用前端 mock 药品表。
-- 需皮试（青霉素/头孢）由审方规则按通用名判定（见门诊服务审方逻辑）。
--
-- Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
-- ============================================================================

INSERT INTO clinical.drug_catalog
  (drug_code, generic_name, brand_name, specification, dosage_form, route, unit,
   price, manufacturer, category, controlled, contraindications, status)
VALUES
  ('D001','阿司匹林','阿司匹林肠溶片','100mg*30片','片剂','po','盒',18.50,'某制药一厂','处方药',false,
   '活动性出血、活动性消化性溃疡、严重血友病','active'),
  ('D002','氯吡格雷','硫酸氢氯吡格雷片','75mg*7片','片剂','po','盒',86.00,'某制药二厂','处方药',false,
   '活动性出血、严重肝功能损害','active'),
  ('D003','阿托伐他汀','阿托伐他汀钙片','20mg*7片','片剂','po','盒',42.00,'某制药三厂','处方药',false,
   '活动性肝病、孕妇及哺乳期','active'),
  ('D004','美托洛尔','琥珀酸美托洛尔缓释片','47.5mg*7片','缓释片','po','盒',35.60,'某制药一厂','处方药',false,
   '二度及以上房室传导阻滞、心源性休克、严重心动过缓','active'),
  ('D005','氨氯地平','苯磺酸氨氯地平片','5mg*14片','片剂','po','盒',22.80,'某制药四厂','处方药',false,
   '严重低血压、重度主动脉瓣狭窄','active'),
  ('D006','缬沙坦','缬沙坦胶囊','80mg*7粒','胶囊','po','盒',28.40,'某制药二厂','处方药',false,
   '妊娠、严重肝功能损害','active'),
  ('D007','单硝酸异山梨酯','单硝酸异山梨酯缓释片','40mg*14片','缓释片','po','盒',32.00,'某制药五厂','处方药',false,
   '青光眼、休克、明显低血压','active'),
  ('D008','硝酸甘油','硝酸甘油片','0.5mg*100片','片剂','舌下含服','瓶',25.00,'某制药一厂','特殊管控',true,
   '严重低血压、青光眼、肥厚型梗阻性心肌病','active'),
  ('D009','二甲双胍','盐酸二甲双胍缓释片','0.5g*30片','缓释片','po','盒',19.80,'某制药三厂','处方药',false,
   'eGFR<30、急性代谢性酸中毒、严重感染缺氧','active'),
  ('D011','门冬胰岛素','门冬胰岛素注射液','300IU*3ml','注射剂','皮下注射','支',68.00,'某生物制药','特殊管控',true,
   '低血糖、胰岛素瘤','active'),
  ('D015','华法林','华法林钠片','2.5mg*60片','片剂','po','盒',28.00,'某制药三厂','特殊管控',true,
   '活动性出血、妊娠、严重高血压、近期手术','active'),
  ('D016','达比加群','达比加群酯胶囊','110mg*30粒','胶囊','po','盒',198.00,'某制药五厂','特殊管控',true,
   '活动性出血、重度肾功能损害','active'),
  ('D017','头孢呋辛','注射用头孢呋辛钠','1.5g/支','注射剂','ivgtt','支',16.00,'某制药一厂','处方药',false,
   '对头孢菌素过敏、青霉素过敏性休克史','active'),
  ('D018','阿莫西林','阿莫西林胶囊','0.25g*24粒','胶囊','po','盒',12.50,'某制药二厂','处方药',false,
   '青霉素过敏、传染性单核细胞增多症','active'),
  ('D019','青霉素钠','注射用青霉素钠','80万U/支','注射剂','ivgtt','支',2.80,'某制药三厂','处方药',false,
   '青霉素过敏（用前必须皮试）','active'),
  ('D020','布洛芬','布洛芬缓释胶囊','0.3g*20粒','缓释胶囊','po','盒',18.00,'某制药四厂','OTC',false,
   '活动性消化性溃疡、严重心肝肾功能不全','active'),
  ('D021','对乙酰氨基酚','对乙酰氨基酚片','0.5g*20片','片剂','po','盒',8.50,'某制药一厂','OTC',false,
   '严重肝功能不全、酒精依赖','active'),
  ('D022','奥美拉唑','奥美拉唑肠溶胶囊','20mg*14粒','胶囊','po','盒',22.00,'某制药二厂','处方药',false,
   '严重肝功能不全慎用','active'),
  ('D025','氨溴索','盐酸氨溴索口服液','100ml:0.6g','口服液','po','瓶',21.00,'某制药一厂','OTC',false,
   '对本品过敏','active'),
  ('D026','布地奈德/福莫特罗','布地奈德福莫特罗粉吸入剂','160/4.5μg*60吸','吸入剂','吸入','支',185.00,'某生物制药','特殊管控',true,
   '对成分过敏','active'),
  ('D036','丹参','丹参滴丸','27mg*180丸','滴丸','舌下含服','瓶',35.00,'某中药二厂','处方药',false,
   '出血倾向、孕妇慎用','active'),
  ('D046','甘精胰岛素','甘精胰岛素注射液','300IU*3ml','注射剂','皮下注射','支',168.00,'某生物制药','特殊管控',true,
   '低血糖','active'),
  ('D047','达格列净','达格列净片','10mg*14片','片剂','po','盒',88.00,'某制药一厂','处方药',false,
   '1 型糖尿病、eGFR 过低、反复酮症','active'),
  ('D050','阿卡波糖','阿卡波糖片','50mg*30片','片剂','po','盒',35.00,'某制药四厂','处方药',false,
   '肠梗阻、严重肠胀气、严重消化吸收障碍','active')
ON CONFLICT (drug_code) DO UPDATE
  SET generic_name = EXCLUDED.generic_name,
      brand_name = EXCLUDED.brand_name,
      specification = EXCLUDED.specification,
      dosage_form = EXCLUDED.dosage_form,
      route = EXCLUDED.route,
      unit = EXCLUDED.unit,
      price = EXCLUDED.price,
      manufacturer = EXCLUDED.manufacturer,
      category = EXCLUDED.category,
      controlled = EXCLUDED.controlled,
      contraindications = EXCLUDED.contraindications,
      status = 'active';

-- 中心药房初始库存
INSERT INTO clinical.drug_inventory (drug_id, warehouse, batch_no, quantity, unit, expiry_date)
SELECT dc.id, '中心药房', 'LOT-' || dc.drug_code, 200, dc.unit, DATE '2027-12-31'
FROM clinical.drug_catalog dc
ON CONFLICT (drug_id, warehouse, batch_no) DO UPDATE
  SET quantity = EXCLUDED.quantity,
      expiry_date = EXCLUDED.expiry_date;
