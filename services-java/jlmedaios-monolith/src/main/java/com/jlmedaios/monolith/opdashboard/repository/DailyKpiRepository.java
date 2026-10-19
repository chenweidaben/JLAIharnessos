/*
 * 健澜科技 jlmedaios - 日 KPI Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.opdashboard.repository;

import com.jlmedaios.monolith.opdashboard.entity.DailyKpi;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * 日 KPI Repository。
 */
@Repository
public interface DailyKpiRepository extends JpaRepository<DailyKpi, Long> {

    /**
     * 按统计日期查询日 KPI。
     *
     * @param date 统计日期
     * @return 日 KPI Optional
     */
    Optional<DailyKpi> findByStatDate(LocalDate date);

    /**
     * 近 30 天趋势（按日期降序）。
     *
     * @return 近 30 天日 KPI 列表
     */
    List<DailyKpi> findTop30ByOrderByStatDateDesc();
}
