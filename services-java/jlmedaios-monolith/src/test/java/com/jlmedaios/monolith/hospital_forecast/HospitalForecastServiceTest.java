/*
 * 健澜科技 jlmedaios - 医院运营预测 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.hospital_forecast;

import com.jlmedaios.monolith.hospital_forecast.entity.ForecastResult;
import com.jlmedaios.monolith.hospital_forecast.service.HospitalForecastService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 医院运营预测 Service 测试。
 */
@SpringBootTest
public class HospitalForecastServiceTest {

    @Autowired
    private HospitalForecastService hospitalForecastService;

    @Test
    void testForecastList() {
        List<ForecastResult> list = hospitalForecastService.forecastList();
        assertNotNull(list);
    }

    @Test
    void testGenerateForecast() {
        ForecastResult result = hospitalForecastService.generateForecast(
                "FC-202610", "门诊量", LocalDate.of(2026, 11, 1), new BigDecimal("15000.00"));
        assertNotNull(result.getId());
        assertEquals("GENERATED", result.getStatus());
    }

    @Test
    void testForecastDetail() {
        ForecastResult result = hospitalForecastService.forecastDetail("FC-202610");
        // 可能为空（H2 内存库无预置数据）
    }
}
