/*
 * 健澜科技 jlmedaios - 医务行政 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.admin.controller;

import com.jlmedaios.monolith.admin.entity.MedicalStaff;
import com.jlmedaios.monolith.admin.service.AdminService;
import com.jlmedaios.monolith.common.Result;
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
 * 医务行政 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/staff")
public class AdminController {

    private final AdminService adminService;

    /**
     * 添加医务人员。
     *
     * @param body {name, dept, title, employeeType, licenseNo}
     * @return Result<MedicalStaff>
     */
    @PostMapping("/add")
    public Result<MedicalStaff> add(@RequestBody Map<String, Object> body) {
        MedicalStaff staff = adminService.add(
                String.valueOf(body.get("name")),
                String.valueOf(body.get("dept")),
                String.valueOf(body.get("title")),
                String.valueOf(body.get("employeeType")),
                String.valueOf(body.get("licenseNo"))
        );
        return Result.ok(staff);
    }

    /**
     * 按科室查询医务人员列表。
     *
     * @param deptCode 科室编码
     * @return Result<List<MedicalStaff>>
     */
    @GetMapping("/dept/{deptCode}")
    public Result<List<MedicalStaff>> listByDept(@PathVariable String deptCode) {
        return Result.ok(adminService.listByDept(deptCode));
    }

    /**
     * 职称变更。
     *
     * @param id   医务人员 ID
     * @param body {newTitle}
     * @return Result<MedicalStaff>
     */
    @PutMapping("/{id}/title")
    public Result<MedicalStaff> changeTitle(@PathVariable Long id,
                                            @RequestBody Map<String, String> body) {
        String newTitle = body.get("newTitle");
        return adminService.changeTitle(id, newTitle)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "医务人员不存在"));
    }
}
