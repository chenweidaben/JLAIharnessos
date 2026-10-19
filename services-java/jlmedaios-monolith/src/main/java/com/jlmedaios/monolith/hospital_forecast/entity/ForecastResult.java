/*
 * 健澜科技 jlmedaios - 预测结果实体
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.hospital_forecast.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * 预测结果实体。
 *
 * <p>预测结果主数据；生产接 ARIMA/Prophet 时序模型，H2 下 mock</p>
 */
@Data
@Entity
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "forecast_result")
public class ForecastResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "forecast_code")
    private String forecastCode;

    @Column(name = "forecast_type")
    private String forecastType;

    @Column(name = "target_date")
    private LocalDate targetDate;

    @Column(name = "predicted_value")
    private BigDecimal predictedValue;

    @Column(name = "actual_value")
    private BigDecimal actualValue;

    @Column(name = "accuracy")
    private BigDecimal accuracy;

    @Column(name = "status")
    @Builder.Default
    private String status = "GENERATED";
}
