/*
 * 健澜科技 jlmedaios - 用药安全 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medication_safety.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.medication_safety.entity.MedicationAlert;
import com.jlmedaios.monolith.medication_safety.service.MedicationSafetyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 用药安全 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/medication")
public class MedicationSafetyController {

    private final MedicationSafetyService medicationSafetyService;

    /**
     * 用药安全预警列表。
     *
     * @return Result<List<MedicationAlert>>
     */
    @GetMapping("/alerts")
    public Result<List<MedicationAlert>> alertList() {
        return Result.ok(medicationSafetyService.alertList());
    }

    /**
     * 用药安全检查。
     *
     * @param body {patientId, medications}
     * @return Result<List<MedicationAlert>>
     */
    @PostMapping("/check")
    public Result<List<MedicationAlert>> check(@RequestBody Map<String, Object> body) {
        return Result.ok(medicationSafetyService.check(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("medications"))
        ));
    }

    /**
     * 确认预警。
     *
     * @param code 预警编码
     * @return Result<MedicationAlert>
     */
    @PutMapping("/alert/{code}/ack")
    public Result<MedicationAlert> acknowledge(@PathVariable String code) {
        return Result.ok(medicationSafetyService.acknowledge(code));
    }
}
