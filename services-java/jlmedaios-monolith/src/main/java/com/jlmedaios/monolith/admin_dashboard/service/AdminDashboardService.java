/*
 * 健澜科技 jlmedaios - 管理驾驶舱 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.admin_dashboard.service;

import com.jlmedaios.monolith.admin_dashboard.entity.ExecutiveKPI;
import com.jlmedaios.monolith.admin_dashboard.repository.ExecutiveKPIRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 管理驾驶舱 Service。
 *
 * <p>院长级 KPI 主数据；生产接 ClickHouse/Doris，H2 下 mock</p>
 */
@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final ExecutiveKPIRepository executiveKPIRepository;

    /**
     * 院长概览（核心 KPI 一览）。
     *
     * @return 院长级 KPI 列表
     */
    public List<ExecutiveKPI> executiveOverview() {
        return executiveKPIRepository.findAll();
    }

    /**
     * 科主任视角。
     *
     * @param deptCode 科室编码
     * @return 院长级 KPI 列表
     */
    public List<ExecutiveKPI> deptView(String deptCode) {
        return executiveKPIRepository.findByCategory("运营");
    }

    /**
     * 管理预警（指标偏离阈值）。
     *
     * @return 院长级 KPI 列表
     */
    public List<ExecutiveKPI> alerts() {
        return executiveKPIRepository.findAll().stream()
                .filter(kpi -> kpi.getCurrentValue() != null
                        && kpi.getTargetValue() != null
                        && kpi.getCurrentValue().compareTo(kpi.getTargetValue()) < 0)
                .toList();
    }
}
