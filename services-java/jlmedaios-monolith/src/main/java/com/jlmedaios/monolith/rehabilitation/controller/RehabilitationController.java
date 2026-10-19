/*
 * 健澜科技 jlmedaios - 康复医学 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.rehabilitation.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.rehabilitation.entity.RehabOrder;
import com.jlmedaios.monolith.rehabilitation.entity.RehabProgress;
import com.jlmedaios.monolith.rehabilitation.service.RehabilitationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 康复医学 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/rehab")
public class RehabilitationController {

    private final RehabilitationService rehabilitationService;

    /**
     * 创建康复处方。
     *
     * @param body {orderNo, patientId, rehabType, diagnosis, startDate, endDate}
     * @return Result<RehabOrder>
     */
    @PostMapping("/order")
    public Result<RehabOrder> createOrder(@RequestBody Map<String, Object> body) {
        RehabOrder order = rehabilitationService.createOrder(
                String.valueOf(body.get("orderNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("rehabType")),
                String.valueOf(body.get("diagnosis")),
                LocalDate.parse(String.valueOf(body.get("startDate"))),
                LocalDate.parse(String.valueOf(body.get("endDate")))
        );
        return Result.ok(order);
    }

    /**
     * 记录康复进度。
     *
     * @param body {orderNo, therapist, progressNotes, goalAchievement}
     * @return Result<RehabProgress>
     */
    @PostMapping("/progress")
    public Result<RehabProgress> recordProgress(@RequestBody Map<String, Object> body) {
        RehabProgress progress = rehabilitationService.recordProgress(
                String.valueOf(body.get("orderNo")),
                String.valueOf(body.get("therapist")),
                String.valueOf(body.get("progressNotes")),
                String.valueOf(body.get("goalAchievement"))
        );
        return Result.ok(progress);
    }

    /**
     * 进行中康复列表。
     *
     * @return Result<List<RehabOrder>>
     */
    @GetMapping("/active")
    public Result<List<RehabOrder>> activeOrders() {
        return Result.ok(rehabilitationService.activeOrders());
    }
}
