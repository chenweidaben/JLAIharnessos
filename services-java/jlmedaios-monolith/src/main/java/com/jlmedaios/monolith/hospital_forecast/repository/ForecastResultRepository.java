/*
 * 健澜科技 jlmedaios - 预测结果 Repository
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.hospital_forecast.repository;

import com.jlmedaios.monolith.hospital_forecast.entity.ForecastResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * 预测结果 Repository。
 */
@Repository
public interface ForecastResultRepository extends JpaRepository<ForecastResult, Long> {

    /**
     * 按预测类型查询预测结果。
     *
     * @param forecastType 预测类型
     * @return 预测结果列表
     */
    List<ForecastResult> findByForecastType(String forecastType);

    /**
     * 按状态查询预测结果。
     *
     * @param status 状态
     * @return 预测结果列表
     */
    List<ForecastResult> findByStatus(String status);
}
