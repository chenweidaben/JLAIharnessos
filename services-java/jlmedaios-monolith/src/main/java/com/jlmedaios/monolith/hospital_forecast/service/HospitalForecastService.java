/*
 * 健澜科技 jlmedaios - 医院运营预测 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.hospital_forecast.service;

import com.jlmedaios.monolith.hospital_forecast.entity.ForecastResult;
import com.jlmedaios.monolith.hospital_forecast.repository.ForecastResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 医院运营预测 Service。
 *
 * <p>预测结果主数据；生产接 ARIMA/Prophet 时序模型，H2 下 mock</p>
 */
@Service
@RequiredArgsConstructor
public class HospitalForecastService {

    private final ForecastResultRepository forecastResultRepository;

    /**
     * 预测列表。
     *
     * @return 预测结果列表
     */
    public List<ForecastResult> forecastList() {
        return forecastResultRepository.findAll();
    }

    /**
     * 生成预测。
     *
     * @param forecastCode  预测编码
     * @param forecastType  预测类型
     * @param targetDate    目标日期
     * @param predictedValue 预测值
     * @return 已持久化的预测结果
     */
    public ForecastResult generateForecast(String forecastCode, String forecastType,
                                            LocalDate targetDate, BigDecimal predictedValue) {
        ForecastResult result = ForecastResult.builder()
                .forecastCode(forecastCode)
                .forecastType(forecastType)
                .targetDate(targetDate)
                .predictedValue(predictedValue)
                .status("GENERATED")
                .build();
        return forecastResultRepository.save(result);
    }

    /**
     * 预测详情。
     *
     * @param forecastCode 预测编码
     * @return 预测结果
     */
    public ForecastResult forecastDetail(String forecastCode) {
        return forecastResultRepository.findAll().stream()
                .filter(f -> forecastCode.equals(f.getForecastCode()))
                .findFirst()
                .orElse(null);
    }
}
