/*
 * 健澜科技 jlmedaios - ICU 管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.icu_management.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.icu_management.entity.ICUMonitoring;
import com.jlmedaios.monolith.icu_management.entity.ICUPatient;
import com.jlmedaios.monolith.icu_management.service.ICUManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;

/**
 * ICU 管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/icu")
public class ICUManagementController {

    private final ICUManagementService icuManagementService;

    /**
     * 转入 ICU。
     *
     * @param body {patientId, bedNo, diagnosis, primaryNurse}
     * @return Result<ICUPatient>
     */
    @PutMapping("/admit")
    public Result<ICUPatient> admit(@RequestBody Map<String, Object> body) {
        ICUPatient patient = icuManagementService.admit(
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("bedNo")),
                String.valueOf(body.get("diagnosis")),
                String.valueOf(body.get("primaryNurse"))
        );
        return Result.ok(patient);
    }

    /**
     * 转出 ICU。
     *
     * @param body {patientId}
     * @return Result<ICUPatient>
     */
    @PutMapping("/discharge")
    public Result<ICUPatient> discharge(@RequestBody Map<String, Object> body) {
        return icuManagementService.discharge(
                Long.valueOf(String.valueOf(body.get("patientId")))
        ).map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 记录生命体征。
     *
     * @param body {patientId, heartRate, bloodPressure, respiratoryRate, spo2, temperature}
     * @return Result<ICUMonitoring>
     */
    @PostMapping("/monitor")
    public Result<ICUMonitoring> monitor(@RequestBody Map<String, Object> body) {
        ICUMonitoring monitoring = icuManagementService.monitor(
                String.valueOf(body.get("patientId")),
                Integer.parseInt(String.valueOf(body.get("heartRate"))),
                String.valueOf(body.get("bloodPressure")),
                Integer.parseInt(String.valueOf(body.get("respiratoryRate"))),
                Integer.parseInt(String.valueOf(body.get("spo2"))),
                new BigDecimal(String.valueOf(body.get("temperature")))
        );
        return Result.ok(monitoring);
    }

    /**
     * ICU 床位状态。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/bed-status")
    public Result<Map<String, Object>> bedStatus() {
        return Result.ok(icuManagementService.bedStatus());
    }
}
