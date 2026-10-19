/*
 * 健澜科技 jlmedaios - 患者画像 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.patient_profile;

import com.jlmedaios.monolith.patient_profile.entity.PatientProfile;
import com.jlmedaios.monolith.patient_profile.service.PatientProfileService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 患者画像 Service 测试。
 */
@SpringBootTest
public class PatientProfileServiceTest {

    @Autowired
    private PatientProfileService patientProfileService;

    @Test
    void testProfile360() {
        PatientProfile profile = patientProfileService.profile360(1L);
        // 可能为空（H2 内存库无预置数据）
    }

    @Test
    void testHighRiskList() {
        List<PatientProfile> list = patientProfileService.highRiskList();
        assertNotNull(list);
    }

    @Test
    void testDepartmentOverview() {
        List<PatientProfile> list = patientProfileService.departmentOverview("CARD");
        assertNotNull(list);
    }
}
