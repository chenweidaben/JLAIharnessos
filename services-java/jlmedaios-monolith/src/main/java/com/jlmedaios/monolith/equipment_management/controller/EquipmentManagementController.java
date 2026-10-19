/*
 * 健澜科技 jlmedaios - 设备管理 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.equipment_management.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.equipment_management.entity.EquipmentMaintenance;
import com.jlmedaios.monolith.equipment_management.entity.MedicalEquipment;
import com.jlmedaios.monolith.equipment_management.service.EquipmentManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 设备管理 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/equipment")
public class EquipmentManagementController {

    private final EquipmentManagementService equipmentManagementService;

    /**
     * 设备清单。
     *
     * @return Result<List<MedicalEquipment>>
     */
    @GetMapping("/list")
    public Result<List<MedicalEquipment>> equipmentList() {
        return Result.ok(equipmentManagementService.equipmentList());
    }

    /**
     * 记录设备维护。
     *
     * @param code 设备编码
     * @param body {maintenanceType, maintenanceVendor, cost, nextMaintenanceDate}
     * @return Result<EquipmentMaintenance>
     */
    @PutMapping("/{code}/maintenance")
    public Result<EquipmentMaintenance> recordMaintenance(@PathVariable String code,
                                                           @RequestBody Map<String, Object> body) {
        EquipmentMaintenance maintenance = equipmentManagementService.recordMaintenance(
                code,
                String.valueOf(body.get("maintenanceType")),
                String.valueOf(body.get("maintenanceVendor")),
                new BigDecimal(String.valueOf(body.get("cost"))),
                LocalDate.parse(String.valueOf(body.get("nextMaintenanceDate")))
        );
        return Result.ok(maintenance);
    }

    /**
     * 即将过保设备。
     *
     * @return Result<List<MedicalEquipment>>
     */
    @GetMapping("/expiring-warranty")
    public Result<List<MedicalEquipment>> expiringWarranty() {
        return Result.ok(equipmentManagementService.expiringWarranty());
    }

    /**
     * 维护历史。
     *
     * @param code 设备编码
     * @return Result<List<EquipmentMaintenance>>
     */
    @GetMapping("/maintenance-history/{code}")
    public Result<List<EquipmentMaintenance>> maintenanceHistory(@PathVariable String code) {
        return Result.ok(equipmentManagementService.maintenanceHistory(code));
    }
}
