/*
 * 健澜科技 jlmedaios - 医务行政 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.admin.service;

import com.jlmedaios.monolith.admin.entity.MedicalStaff;
import com.jlmedaios.monolith.admin.repository.MedicalStaffRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * 医务行政 Service。
 */
@Service
@RequiredArgsConstructor
public class AdminService {

    private final MedicalStaffRepository medicalStaffRepository;

    /**
     * 添加医务人员。
     *
     * @param name          姓名
     * @param dept          科室
     * @param title         职称
     * @param employeeType  人员类型
     * @param licenseNo     执业证号
     * @return 已持久化的医务人员
     */
    public MedicalStaff add(String name, String dept, String title,
                             String employeeType, String licenseNo) {
        MedicalStaff staff = MedicalStaff.builder()
                .name(name)
                .dept(dept)
                .title(title)
                .employeeType(employeeType)
                .licenseNo(licenseNo)
                .build();
        return medicalStaffRepository.save(staff);
    }

    /**
     * 按科室查询医务人员列表。
     *
     * @param dept 科室
     * @return 医务人员列表
     */
    public List<MedicalStaff> listByDept(String dept) {
        return medicalStaffRepository.findByDept(dept);
    }

    /**
     * 职称变更（留痕）。
     *
     * @param id       医务人员 ID
     * @param newTitle  新职称
     * @return 更新后的医务人员
     */
    public Optional<MedicalStaff> changeTitle(Long id, String newTitle) {
        Optional<MedicalStaff> opt = medicalStaffRepository.findById(id);
        opt.ifPresent(staff -> {
            staff.setTitle(newTitle);
            medicalStaffRepository.save(staff);
        });
        return opt;
    }
}
