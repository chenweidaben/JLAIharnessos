/*
 * 健澜科技 jlmedaios - 质量 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.quality.service;

import com.jlmedaios.monolith.quality.entity.QualityMetric;
import com.jlmedaios.monolith.quality.repository.QualityMetricRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 质量 Service。
 */
@Service
@RequiredArgsConstructor
public class QualityService {

    private final QualityMetricRepository qualityMetricRepository;

    // 18 项核心制度指标（先列 6 个示例）
    public static final List<String> METRIC_CODES = List.of(
            "治愈率", "平均住院日", "围手术期死亡率",
            "院内感染率", "三日确诊率", "危重抢救成功率"
    );

    /**
     * 录入质量指标，自动算 grade。
     * actualValue >= targetValue → A
     * actualValue >= 90% targetValue → B
     * actualValue >= 80% targetValue → C
     * 否则 → D
     *
     * @param deptCode    科室编码
     * @param metricCode  指标编码
     * @param periodValue 统计周期
     * @param targetValue 目标值
     * @param actualValue 实际值
     * @return 已持久化的质量指标
     */
    public QualityMetric record(String deptCode, String metricCode, String periodValue,
                                 BigDecimal targetValue, BigDecimal actualValue) {
        String grade = calculateGrade(targetValue, actualValue);

        QualityMetric metric = QualityMetric.builder()
                .deptCode(deptCode)
                .metricCode(metricCode)
                .periodValue(periodValue)
                .targetValue(targetValue)
                .actualValue(actualValue)
                .grade(grade)
                .build();
        return qualityMetricRepository.save(metric);
    }

    /**
     * 按科室查询质量指标列表。
     *
     * @param deptCode 科室编码
     * @return 质量指标列表
     */
    public List<QualityMetric> listByDept(String deptCode) {
        return qualityMetricRepository.findByDeptCode(deptCode);
    }

    /**
     * 全院汇总（mock 返回总数 + 平均 grade）。
     *
     * @return 汇总结果 Map
     */
    public Map<String, Object> hospitalSummary() {
        List<QualityMetric> all = qualityMetricRepository.findAll();

        long total = all.size();
        long gradeA = all.stream().filter(m -> "A".equals(m.getGrade())).count();
        long gradeB = all.stream().filter(m -> "B".equals(m.getGrade())).count();
        long gradeC = all.stream().filter(m -> "C".equals(m.getGrade())).count();
        long gradeD = all.stream().filter(m -> "D".equals(m.getGrade())).count();

        Map<String, Object> summary = new HashMap<>();
        summary.put("total", total);
        summary.put("gradeA", gradeA);
        summary.put("gradeB", gradeB);
        summary.put("gradeC", gradeC);
        summary.put("gradeD", gradeD);
        summary.put("passRate", total > 0
                ? BigDecimal.valueOf(gradeA + gradeB)
                        .divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP)
                        .multiply(BigDecimal.valueOf(100)) + "%"
                : "0%");
        return summary;
    }

    /**
     * 计算评级。
     */
    private String calculateGrade(BigDecimal target, BigDecimal actual) {
        if (target == null || target.compareTo(BigDecimal.ZERO) == 0) {
            return "D";
        }
        BigDecimal ratio = actual.divide(target, 4, RoundingMode.HALF_UP);
        if (ratio.compareTo(BigDecimal.ONE) >= 0) {
            return "A";
        } else if (ratio.compareTo(new BigDecimal("0.9")) >= 0) {
            return "B";
        } else if (ratio.compareTo(new BigDecimal("0.8")) >= 0) {
            return "C";
        } else {
            return "D";
        }
    }
}
