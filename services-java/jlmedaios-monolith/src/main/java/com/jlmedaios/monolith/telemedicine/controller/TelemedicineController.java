/*
 * 健澜科技 jlmedaios - 远程医疗 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.telemedicine.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.telemedicine.entity.TelemedicineVisit;
import com.jlmedaios.monolith.telemedicine.service.TelemedicineService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 远程医疗 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/telemedicine")
public class TelemedicineController {

    private final TelemedicineService telemedicineService;

    /**
     * 创建远程问诊。
     *
     * @param body {visitNo, patientId, doctorId, department, visitType}
     * @return Result<TelemedicineVisit>
     */
    @PostMapping("/create")
    public Result<TelemedicineVisit> createVisit(@RequestBody Map<String, Object> body) {
        TelemedicineVisit visit = telemedicineService.createVisit(
                String.valueOf(body.get("visitNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("doctorId")),
                String.valueOf(body.get("department")),
                String.valueOf(body.get("visitType"))
        );
        return Result.ok(visit);
    }

    /**
     * 开始问诊。
     *
     * @param id 问诊 ID
     * @return Result<TelemedicineVisit>
     */
    @PutMapping("/{id}/start")
    public Result<TelemedicineVisit> startVisit(@PathVariable Long id) {
        return telemedicineService.startVisit(id)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 结束问诊。
     *
     * @param id   问诊 ID
     * @param body {durationMinutes, prescriptionIssued}
     * @return Result<TelemedicineVisit>
     */
    @PutMapping("/{id}/end")
    public Result<TelemedicineVisit> endVisit(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return telemedicineService.endVisit(
                id,
                Integer.parseInt(String.valueOf(body.get("durationMinutes"))),
                Boolean.valueOf(String.valueOf(body.get("prescriptionIssued")))
        ).map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 待接诊列表。
     *
     * @return Result<List<TelemedicineVisit>>
     */
    @GetMapping("/pending")
    public Result<List<TelemedicineVisit>> pendingList() {
        return Result.ok(telemedicineService.pendingList());
    }
}
