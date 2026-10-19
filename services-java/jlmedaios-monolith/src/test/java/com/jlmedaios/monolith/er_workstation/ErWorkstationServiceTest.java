/*
 * 健澜科技 jlmedaios - 急诊工作站 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.er_workstation;

import com.jlmedaios.monolith.er_workstation.entity.ERVisit;
import com.jlmedaios.monolith.er_workstation.service.ErWorkstationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 急诊工作站 Service 测试。
 */
@SpringBootTest
public class ErWorkstationServiceTest {

    @Autowired
    private ErWorkstationService erWorkstationService;

    @Test
    void testTodayVisits() {
        List<ERVisit> list = erWorkstationService.todayVisits();
        assertNotNull(list);
    }

    @Test
    void testTriage() {
        ERVisit visit = erWorkstationService.triage("ER-001", "Ⅱ");
        assertNotNull(visit);
    }

    @Test
    void testAdmit() {
        ERVisit visit = erWorkstationService.admit("ER-001", "D001", "抢救室1");
        assertNotNull(visit);
    }

    @Test
    void testDischarge() {
        ERVisit visit = erWorkstationService.discharge("ER-001", "收入院");
        assertNotNull(visit);
    }
}
