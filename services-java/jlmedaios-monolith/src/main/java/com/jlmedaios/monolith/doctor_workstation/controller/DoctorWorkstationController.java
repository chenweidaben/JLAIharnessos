/*
 * 健澜科技 jlmedaios - 医生工作站 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.doctor_workstation.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.doctor_workstation.entity.DoctorSession;
import com.jlmedaios.monolith.doctor_workstation.service.DoctorWorkstationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 医生工作站 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/doctor")
public class DoctorWorkstationController {

    private final DoctorWorkstationService doctorWorkstationService;

    /**
     * 今日接诊列表。
     *
     * @param doctorId 医生 ID（从 header 获取）
     * @return Result<List<DoctorSession>>
     */
    @GetMapping("/today/patients")
    public Result<List<DoctorSession>> todayPatients(
            @RequestHeader(value = "X-Doctor-Id", required = false) String doctorId) {
        return Result.ok(doctorWorkstationService.todayPatients(doctorId));
    }

    /**
     * 开始接诊。
     *
     * @param body {doctorId, patientId, department}
     * @return Result<DoctorSession>
     */
    @PostMapping("/visit/start")
    public Result<DoctorSession> startVisit(@RequestBody Map<String, Object> body) {
        DoctorSession session = doctorWorkstationService.startVisit(
                String.valueOf(body.get("doctorId")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("department"))
        );
        return Result.ok(session);
    }

    /**
     * 结束接诊。
     *
     * @param id 会话 ID
     * @return Result<DoctorSession>
     */
    @PutMapping("/visit/{id}/end")
    public Result<DoctorSession> endVisit(@PathVariable Long id) {
        return Result.ok(doctorWorkstationService.endVisit(id));
    }

    /**
     * 接诊详情。
     *
     * @param id 会话 ID
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/visit/{id}/detail")
    public Result<Map<String, Object>> visitDetail(@PathVariable Long id) {
        return Result.ok(doctorWorkstationService.visitDetail(id));
    }
}
