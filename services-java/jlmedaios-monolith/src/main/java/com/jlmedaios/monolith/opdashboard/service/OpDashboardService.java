/*
 * 健澜科技 jlmedaios - 运营看板 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.opdashboard.service;

import com.jlmedaios.monolith.opdashboard.entity.DailyKpi;
import com.jlmedaios.monolith.opdashboard.repository.DailyKpiRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 运营看板 Service。
 */
@Service
@RequiredArgsConstructor
public class OpDashboardService {

    private final DailyKpiRepository dailyKpiRepository;

    /**
     * 查日 KPI。
     *
     * @param date 统计日期
     * @return 日 KPI Optional
     */
    public Optional<DailyKpi> daily(LocalDate date) {
        return dailyKpiRepository.findByStatDate(date);
    }

    /**
     * 近 30 天趋势。
     *
     * @return 近 30 天日 KPI 列表
     */
    public List<DailyKpi> trend() {
        return dailyKpiRepository.findTop30ByOrderByStatDateDesc();
    }

    /**
     * 数据导入。
     *
     * @param statDate         统计日期
     * @param outpatientVisits  门诊量
     * @param inpatientCount   住院人数
     * @param avgLOS           平均住院日
     * @param pharmacyRatio    药占比
     * @param revenue          收入
     * @return 已持久化的日 KPI
     */
    public DailyKpi importKpi(LocalDate statDate, Integer outpatientVisits,
                               Integer inpatientCount, BigDecimal avgLOS,
                               BigDecimal pharmacyRatio, BigDecimal revenue) {
        DailyKpi kpi = DailyKpi.builder()
                .statDate(statDate)
                .outpatientVisits(outpatientVisits)
                .inpatientCount(inpatientCount)
                .avgLOS(avgLOS)
                .pharmacyRatio(pharmacyRatio)
                .revenue(revenue)
                .build();
        return dailyKpiRepository.save(kpi);
    }
}
