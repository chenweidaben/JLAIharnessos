/*
 * 健澜科技 jlmedaios - 医疗质量控制 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_quality.service;

import com.jlmedaios.monolith.medical_quality.entity.QualityCheckRecord;
import com.jlmedaios.monolith.medical_quality.entity.QualityIndicator;
import com.jlmedaios.monolith.medical_quality.repository.QualityCheckRecordRepository;
import com.jlmedaios.monolith.medical_quality.repository.QualityIndicatorRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 医疗质量控制 Service。
 *
 * <p>append-only: 质量检查记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class MedicalQualityService {

    private final QualityIndicatorRepository qualityIndicatorRepository;
    private final QualityCheckRecordRepository qualityCheckRecordRepository;

    /**
     * 质量指标列表。
     *
     * @return 指标列表
     */
    public List<QualityIndicator> indicatorList() {
        return qualityIndicatorRepository.findAll();
    }

    /**
     * 创建质量检查记录。
     *
     * @param checkNo      检查编号
     * @param department   科室
     * @param checker      检查人
     * @param findings     发现问题
     * @param conclusion   结论
     * @return 已持久化的检查记录
     */
    public QualityCheckRecord createCheck(String checkNo, String department, String checker,
                                          String findings, String conclusion) {
        QualityCheckRecord record = QualityCheckRecord.builder()
                .checkNo(checkNo)
                .department(department)
                .checkDate(LocalDate.now())
                .checker(checker)
                .findings(findings)
                .conclusion(conclusion)
                .build();
        return qualityCheckRecordRepository.save(record);
    }

    /**
     * 质量统计（mock）。
     *
     * @return 统计数据
     */
    public Map<String, Object> stats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("achievement_rate", new BigDecimal("0.85"));
        stats.put("total_indicators", 20);
        return stats;
    }
}
