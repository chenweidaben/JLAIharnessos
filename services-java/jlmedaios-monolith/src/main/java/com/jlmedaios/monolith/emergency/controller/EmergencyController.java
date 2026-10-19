/*
 * 健澜科技 jlmedaios - 急诊管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.emergency.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.emergency.entity.EmergencyVisit;
import com.jlmedaios.monolith.emergency.service.EmergencyService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 急诊管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/emergency")
public class EmergencyController {

    private final EmergencyService emergencyService;

    /**
     * 急诊登记。
     *
     * @param body {patientId, chiefComplaint, attendingDoctor}
     * @return Result<EmergencyVisit>
     */
    @PostMapping("/register")
    public Result<EmergencyVisit> register(@RequestBody Map<String, Object> body) {
        EmergencyVisit visit = emergencyService.register(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("chiefComplaint")),
                String.valueOf(body.get("attendingDoctor"))
        );
        return Result.ok(visit);
    }

    /**
     * 急诊分诊。
     *
     * @param id   急诊就诊 ID
     * @param body {triageLevel}
     * @return Result<EmergencyVisit>
     */
    @PutMapping("/{id}/triage")
    public Result<EmergencyVisit> triage(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return emergencyService.triage(id, String.valueOf(body.get("triageLevel")))
                .map(Result::ok)
                .orElseGet(() -> Result.ok(null));
    }

    /**
     * 急诊离院。
     *
     * @param id   急诊就诊 ID
     * @param body {departureType}
     * @return Result<EmergencyVisit>
     */
    @PutMapping("/{id}/depart")
    public Result<EmergencyVisit> depart(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return emergencyService.depart(id, String.valueOf(body.get("departureType")))
                .map(Result::ok)
                .orElseGet(() -> Result.ok(null));
    }

    /**
     * 急诊中列表。
     *
     * @return Result<List<EmergencyVisit>>
     */
    @GetMapping("/ongoing")
    public Result<List<EmergencyVisit>> ongoingList() {
        return Result.ok(emergencyService.ongoingList());
    }
}
