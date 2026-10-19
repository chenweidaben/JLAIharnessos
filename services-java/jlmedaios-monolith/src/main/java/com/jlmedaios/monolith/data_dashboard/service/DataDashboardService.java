/*
 * 健澜科技 jlmedaios - 数据看板 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.data_dashboard.service;

import com.jlmedaios.monolith.data_dashboard.repository.DashboardWidgetRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

/**
 * 数据看板 Service。
 *
 * <p>看板部件主数据；生产接 ClickHouse/Doris，H2 下 mock 数据</p>
 */
@Service
@RequiredArgsConstructor
public class DataDashboardService {

    private final DashboardWidgetRepository dashboardWidgetRepository;

    /**
     * 全院概览（mock 数据）。
     *
     * @return 全院概览指标
     */
    public Map<String, Object> hospitalOverview() {
        Map<String, Object> result = new HashMap<>();
        result.put("today_outpatient", 5230);
        result.put("in_patient_count", 1856);
        result.put("surgery_count_today", 42);
        result.put("bed_occupancy_rate", "92.8%");
        return result;
    }

    /**
     * 科室看板（按 deptCode 返回科室级指标）。
     *
     * @param deptCode 科室编码
     * @return 科室看板指标
     */
    public Map<String, Object> departmentBoard(String deptCode) {
        Map<String, Object> result = new HashMap<>();
        result.put("dept_code", deptCode);
        result.put("today_visits", 320);
        result.put("avg_wait_minutes", 18);
        result.put("bed_occupancy", "88%");
        result.put("widgets", dashboardWidgetRepository.findByDeptCode(deptCode).size());
        return result;
    }

    /**
     * 实时数据（每 5 分钟刷新）。
     *
     * @return 实时数据
     */
    public Map<String, Object> realTimeData() {
        Map<String, Object> metrics = new HashMap<>();
        metrics.put("current_outpatient", 1280);
        metrics.put("current_inpatient", 1856);
        metrics.put("current_operating_rooms", 12);

        Map<String, Object> result = new HashMap<>();
        result.put("timestamp", LocalDateTime.now().toString());
        result.put("metrics", metrics);
        return result;
    }
}
