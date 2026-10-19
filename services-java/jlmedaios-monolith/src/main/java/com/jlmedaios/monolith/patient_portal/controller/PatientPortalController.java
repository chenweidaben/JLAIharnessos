/*
 * 健澜科技 jlmedaios - 患者门户 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_portal.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.patient_portal.entity.PatientMessage;
import com.jlmedaios.monolith.patient_portal.entity.PatientPortalUser;
import com.jlmedaios.monolith.patient_portal.service.PatientPortalService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

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

    /**
     * 患者消息列表。
     *
     * @param patientId 患者 ID
     * @return Result<List<PatientMessage>>
     */
    @GetMapping("/messages")
    public Result<List<PatientMessage>> messageList(@RequestParam Long patientId) {
        return Result.ok(patientPortalService.messageList(patientId));
    }

    /**
     * 标记已读。
     *
     * @param id 消息 ID
     * @return Result<PatientMessage>
     */
    @PutMapping("/message/{id}/read")
    public Result<PatientMessage> markRead(@PathVariable Long id) {
        return patientPortalService.markRead(id)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 患者检查报告。
     *
     * @param patientId 患者 ID
     * @return Result<List<Map<String, Object>>>
     */
    @GetMapping("/reports")
    public Result<List<Map<String, Object>>> patientReports(@RequestParam Long patientId) {
        return Result.ok(patientPortalService.patientReports(patientId));
    }

    /**
     * 就诊历史。
     *
     * @param patientId 患者 ID
     * @return Result<List<Map<String, Object>>>
     */
    @GetMapping("/visits")
    public Result<List<Map<String, Object>>> visitHistory(@RequestParam Long patientId) {
        return Result.ok(patientPortalService.visitHistory(patientId));
    }
}
