/*
 * 健澜科技 jlmedaios - 皮肤科工作站 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.dermatology_workstation;

import com.jlmedaios.monolith.dermatology_workstation.entity.DermatologyRecord;
import com.jlmedaios.monolith.dermatology_workstation.service.DermatologyWorkstationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 皮肤科工作站 Service 测试。
 */
@SpringBootTest
public class DermatologyWorkstationServiceTest {

    @Autowired
    private DermatologyWorkstationService dermatologyWorkstationService;

    @Test
    void testTodayPatients() {
        List<DermatologyRecord> list = dermatologyWorkstationService.todayPatients();
        assertNotNull(list);
    }

    @Test
    void testCreateRecord() {
        DermatologyRecord record = dermatologyWorkstationService.createRecord(
                "DERM-001", "P001", "前臂屈侧", "红斑丘疹", "湿疹");
        assertNotNull(record.getId());
    }

    @Test
    void testRecordTreatment() {
        DermatologyRecord record = dermatologyWorkstationService.recordTreatment(
                "DERM-001", "外用激素+保湿", LocalDate.now().plusDays(14));
        assertNotNull(record);
    }

    @Test
    void testDermatologyHistory() {
        List<DermatologyRecord> history = dermatologyWorkstationService.dermatologyHistory(1L);
        assertNotNull(history);
    }
}
