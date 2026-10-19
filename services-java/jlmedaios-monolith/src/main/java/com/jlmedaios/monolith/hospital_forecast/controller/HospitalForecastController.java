/*
 * 健澜科技 jlmedaios - 医院运营预测 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.hospital_forecast.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.hospital_forecast.entity.ForecastResult;
import com.jlmedaios.monolith.hospital_forecast.service.HospitalForecastService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 医院运营预测 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/forecast")
public class HospitalForecastController {

    private final HospitalForecastService hospitalForecastService;

    /**
     * 预测列表。
     *
     * @return Result<List<ForecastResult>>
     */
    @GetMapping("/list")
    public Result<List<ForecastResult>> forecastList() {
        return Result.ok(hospitalForecastService.forecastList());
    }

    /**
     * 生成预测。
     *
     * @param body {forecastCode, forecastType, targetDate, predictedValue}
     * @return Result<ForecastResult>
     */
    @PostMapping("/generate")
    public Result<ForecastResult> generateForecast(@RequestBody Map<String, Object> body) {
        ForecastResult result = hospitalForecastService.generateForecast(
                String.valueOf(body.get("forecastCode")),
                String.valueOf(body.get("forecastType")),
                LocalDate.parse(String.valueOf(body.get("targetDate"))),
                new BigDecimal(String.valueOf(body.get("predictedValue")))
        );
        return Result.ok(result);
    }

    /**
     * 预测详情。
     *
     * @param forecastCode 预测编码
     * @return Result<ForecastResult>
     */
    @GetMapping("/{forecastCode}")
    public Result<ForecastResult> forecastDetail(@PathVariable String forecastCode) {
        return Result.ok(hospitalForecastService.forecastDetail(forecastCode));
    }
}
