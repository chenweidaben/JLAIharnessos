/*
 * 健澜科技 jlmedaios - 投诉管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.complaint.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.complaint.entity.Complaint;
import com.jlmedaios.monolith.complaint.service.ComplaintService;
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
 * 投诉管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/complaint")
public class ComplaintController {

    private final ComplaintService complaintService;

    /**
     * 接收投诉。
     *
     * @param body {complaintNo, patientName, deptCode, staffId, complaintType, description}
     * @return Result<Complaint>
     */
    @PostMapping("/receive")
    public Result<Complaint> receive(@RequestBody Map<String, Object> body) {
        Complaint complaint = complaintService.receive(
                String.valueOf(body.get("complaintNo")),
                String.valueOf(body.get("patientName")),
                String.valueOf(body.get("deptCode")),
                String.valueOf(body.get("staffId")),
                String.valueOf(body.get("complaintType")),
                String.valueOf(body.get("description"))
        );
        return Result.ok(complaint);
    }

    /**
     * 分配处理人。
     *
     * @param id   投诉 ID
     * @param body {handlerId}
     * @return Result<Complaint>
     */
    @PutMapping("/{id}/assign")
    public Result<Complaint> assign(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return complaintService.assign(id, String.valueOf(body.get("handlerId")))
                .map(Result::ok)
                .orElseGet(() -> Result.ok(null));
    }

    /**
     * 解决投诉。
     *
     * @param id   投诉 ID
     * @param body {resolution}
     * @return Result<Complaint>
     */
    @PutMapping("/{id}/resolve")
    public Result<Complaint> resolve(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return complaintService.resolve(id, String.valueOf(body.get("resolution")))
                .map(Result::ok)
                .orElseGet(() -> Result.ok(null));
    }

    /**
     * 待处理投诉列表。
     *
     * @return Result<List<Complaint>>
     */
    @GetMapping("/pending")
    public Result<List<Complaint>> pendingList() {
        return Result.ok(complaintService.pendingList());
    }
}
