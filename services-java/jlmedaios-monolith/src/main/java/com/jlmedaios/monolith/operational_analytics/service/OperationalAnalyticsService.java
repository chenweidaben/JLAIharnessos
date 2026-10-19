/*
 * 健澜科技 jlmedaios - 运营分析 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.operational_analytics.service;

import com.jlmedaios.monolith.operational_analytics.repository.DepartmentMetricRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

/**
 * 运营分析 Service。
 *
 * <p>数据从各模块聚合，生产接数仓/OLAP（ClickHouse/Doris）</p>
 */
@Service
@RequiredArgsConstructor
public class OperationalAnalyticsService {

    private final DepartmentMetricRepository departmentMetricRepository;

    /**
     * 科室运营汇总（mock）。
     *
     * @param deptCode 科室编码
     * @return 科室运营汇总
     */
    public Map<String, Object> deptSummary(String deptCode) {
        // mock：返回固定科室指标
        return Map.of(
                "deptCode", deptCode,
                "outpatientVolume", 1250,
                "dischargedPatients", 320,
                "surgeryCount", 85,
                "averageLOS", 6.2,
                "bedTurnoverRate", 8.5,
                "drugRatio", 0.35,
                "consumableRatio", 0.18,
                "patientSatisfaction", 0.92
        );
    }

    /**
     * 全院概览（mock）。
     *
     * @return 全院概览
     */
    public Map<String, Object> hospitalOverview() {
        return Map.of(
                "totalOutpatient", 35000,
                "totalInpatient", 1200,
                "totalSurgery", 280,
                "bedOccupancyRate", 0.85,
                "averageLOS", 7.5,
                "patientSatisfaction", 0.90,
                "drugRatio", 0.32,
                "consumableRatio", 0.15
        );
    }

    /**
     * 科室间对比（按指标排序，mock）。
     *
     * @param metricName 指标名称
     * @return 科室对比列表
     */
    public List<Map<String, Object>> compareByMetric(String metricName) {
        // mock：返回 3 个科室对比
        return List.of(
                Map.of("deptCode", "CARD", "metricValue", 0.92, "rank", 1),
                Map.of("deptCode", "RESP", "metricValue", 0.88, "rank", 2),
                Map.of("deptCode", "GI", "metricValue", 0.85, "rank", 3)
        );
    }
}
