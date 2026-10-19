/*
 * 健澜科技 jlmedaios - 绩效考核 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.performance.service;

import com.jlmedaios.monolith.performance.entity.PerformanceIndicator;
import com.jlmedaios.monolith.performance.entity.PerformanceResult;
import com.jlmedaios.monolith.performance.entity.PerformanceScore;
import com.jlmedaios.monolith.performance.repository.PerformanceIndicatorRepository;
import com.jlmedaios.monolith.performance.repository.PerformanceResultRepository;
import com.jlmedaios.monolith.performance.repository.PerformanceScoreRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * 绩效考核 Service。
 *
 * <p>append-only: 绩效分录入/考核结果不可修改，季度审计</p>
 */
@Service
@RequiredArgsConstructor
public class PerformanceService {

    private final PerformanceScoreRepository performanceScoreRepository;
    private final PerformanceIndicatorRepository performanceIndicatorRepository;
    private final PerformanceResultRepository performanceResultRepository;

    /**
     * 录入绩效分（自动算 weightedScore = score * weight）。
     *
     * @param staffId   员工工号
     * @param deptCode  科室编码
     * @param period    周期
     * @param metricCode 指标编码
     * @param score     原始分
     * @param weight    权重
     * @return 已持久化的绩效分
     */
    public PerformanceScore recordScore(String staffId, String deptCode, String period,
                                        String metricCode, BigDecimal score, BigDecimal weight) {
        BigDecimal weightedScore = score.multiply(weight).setScale(2, RoundingMode.HALF_UP);
        PerformanceScore ps = PerformanceScore.builder()
                .staffId(staffId)
                .deptCode(deptCode)
                .period(period)
                .metricCode(metricCode)
                .score(score)
                .weightedScore(weightedScore)
                .build();
        return performanceScoreRepository.save(ps);
    }

    /**
     * 科室绩效汇总（mock）。
     *
     * @param deptCode 科室编码
     * @return 汇总数据
     */
    public Map<String, Object> deptSummary(String deptCode) {
        Map<String, Object> summary = new HashMap<>();
        summary.put("avg_score", 92.5);
        summary.put("total_staff", 15);
        return summary;
    }

    /**
     * 员工绩效历史。
     *
     * @param staffId 员工工号
     * @return 绩效分列表
     */
    public List<PerformanceScore> staffHistory(String staffId) {
        return performanceScoreRepository.findByStaffId(staffId);
    }

    /**
     * 全部考核指标。
     *
     * @return 考核指标列表
     */
    public List<PerformanceIndicator> allIndicators() {
        return performanceIndicatorRepository.findAll();
    }

    /**
     * 生成考核结果（mock）。
     *
     * @param departmentCode 科室编码
     * @param period         周期
     * @return 考核结果
     */
    public PerformanceResult evaluate(String departmentCode, String period) {
        PerformanceResult result = PerformanceResult.builder()
                .departmentCode(departmentCode)
                .period(period)
                .totalScore(new BigDecimal("92.5"))
                .rank(1)
                .status("EXCELLENT")
                .build();
        return performanceResultRepository.save(result);
    }

    /**
     * 科室排名（mock）。
     *
     * @param period 周期
     * @return 考核结果列表
     */
    public List<PerformanceResult> ranking(String period) {
        return performanceResultRepository.findByPeriod(period);
    }
}
