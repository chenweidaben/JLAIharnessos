/*
 * 健澜科技 jlmedaios - 设备管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.equipment_management.service;

import com.jlmedaios.monolith.equipment_management.entity.EquipmentMaintenance;
import com.jlmedaios.monolith.equipment_management.entity.MedicalEquipment;
import com.jlmedaios.monolith.equipment_management.repository.EquipmentMaintenanceRepository;
import com.jlmedaios.monolith.equipment_management.repository.MedicalEquipmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/**
 * 设备管理 Service。
 *
 * <p>append-only: 维护记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class EquipmentManagementService {

    private final MedicalEquipmentRepository medicalEquipmentRepository;
    private final EquipmentMaintenanceRepository equipmentMaintenanceRepository;

    /**
     * 设备清单。
     *
     * @return 设备列表
     */
    public List<MedicalEquipment> equipmentList() {
        return medicalEquipmentRepository.findAll();
    }

    /**
     * 记录设备维护。
     *
     * @param equipmentCode        设备编码
     * @param maintenanceType      维护类型
     * @param maintenanceVendor    维护厂商
     * @param cost                 维护费用
     * @param nextMaintenanceDate  下次维护日期
     * @return 已持久化的维护记录
     */
    public EquipmentMaintenance recordMaintenance(String equipmentCode, String maintenanceType,
                                                  String maintenanceVendor, BigDecimal cost,
                                                  LocalDate nextMaintenanceDate) {
        EquipmentMaintenance maintenance = EquipmentMaintenance.builder()
                .maintenanceNo("MNT-" + System.currentTimeMillis())
                .equipmentCode(equipmentCode)
                .maintenanceType(maintenanceType)
                .maintenanceVendor(maintenanceVendor)
                .cost(cost)
                .nextMaintenanceDate(nextMaintenanceDate)
                .build();
        return equipmentMaintenanceRepository.save(maintenance);
    }

    /**
     * 即将过保设备（30 天内）。
     *
     * @return 设备列表
     */
    public List<MedicalEquipment> expiringWarranty() {
        LocalDate threshold = LocalDate.now().plusDays(30);
        return medicalEquipmentRepository.findByWarrantyEndDateBefore(threshold);
    }

    /**
     * 维护历史。
     *
     * @param equipmentCode 设备编码
     * @return 维护记录列表
     */
    public List<EquipmentMaintenance> maintenanceHistory(String equipmentCode) {
        return equipmentMaintenanceRepository.findByEquipmentCode(equipmentCode);
    }
}
