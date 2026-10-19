/*
 * 健澜科技 jlmedaios - 急诊高级 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.emergency_advanced.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.emergency_advanced.entity.EmergencyVisit;
import com.jlmedaios.monolith.emergency_advanced.service.EmergencyAdvancedService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 急诊高级 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/emergency")
public class EmergencyAdvancedController {

    private final EmergencyAdvancedService emergencyAdvancedService;

    /**
     * 急诊登记。
     *
     * @param body {visitNo, patientId, chiefComplaint}
     * @return Result<EmergencyVisit>
     */
    @PostMapping("/visit")
    public Result<EmergencyVisit> register(@RequestBody Map<String, Object> body) {
        EmergencyVisit visit = emergencyAdvancedService.register(
                String.valueOf(body.get("visitNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("chiefComplaint"))
        );
        return Result.ok(visit);
    }

    /**
     * 分诊。
     *
     * @param id   就诊记录 ID
     * @param body {triageLevel}
     * @return Result<EmergencyVisit>
     */
    @PutMapping("/visit/{id}/triage")
    public Result<EmergencyVisit> triage(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return emergencyAdvancedService.triage(id, String.valueOf(body.get("triageLevel")))
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 转归。
     *
     * @param id   就诊记录 ID
     * @param body {transferTo}
     * @return Result<EmergencyVisit>
     */
    @PutMapping("/visit/{id}/transfer")
    public Result<EmergencyVisit> transfer(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return emergencyAdvancedService.transfer(id, String.valueOf(body.get("transferTo")))
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 急诊统计。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        return Result.ok(emergencyAdvancedService.stats());
    }
}
