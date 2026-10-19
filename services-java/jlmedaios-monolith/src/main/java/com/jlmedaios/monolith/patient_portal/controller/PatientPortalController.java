/*
 * 健澜科技 jlmedaios - 患者门户 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_portal.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.patient_portal.entity.PatientPortalUser;
import com.jlmedaios.monolith.patient_portal.service.PatientPortalService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 患者门户 Controller。
 *
 * <p>患者只读病历，写操作走医生端</p>
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/portal")
public class PatientPortalController {

    private final PatientPortalService patientPortalService;

    /**
     * 注册患者门户用户。
     *
     * @param body {patientId, phone}
     * @return Result<PatientPortalUser>
     */
    @PostMapping("/register")
    public Result<PatientPortalUser> register(@RequestBody Map<String, Object> body) {
        PatientPortalUser user = patientPortalService.register(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("phone"))
        );
        return Result.ok(user);
    }

    /**
     * 我的病历（mock）。
     *
     * @return Result<List<Map<String, Object>>>
     */
    @GetMapping("/my-records")
    public Result<List<Map<String, Object>>> myRecords() {
        return Result.ok(patientPortalService.myRecords(1L));
    }

    /**
     * 我的预约（mock）。
     *
     * @return Result<List<Map<String, Object>>>
     */
    @GetMapping("/my-appointments")
    public Result<List<Map<String, Object>>> myAppointments() {
        return Result.ok(patientPortalService.myAppointments(1L));
    }

    /**
     * 我的账单（mock）。
     *
     * @return Result<List<Map<String, Object>>>
     */
    @GetMapping("/my-bills")
    public Result<List<Map<String, Object>>> myBills() {
        return Result.ok(patientPortalService.myBills(1L));
    }
}
