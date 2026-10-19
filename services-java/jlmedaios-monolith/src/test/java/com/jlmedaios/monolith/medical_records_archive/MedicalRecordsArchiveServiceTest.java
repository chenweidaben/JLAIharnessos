/*
 * 健澜科技 jlmedaios - 病案室管理 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_records_archive;

import com.jlmedaios.monolith.medical_records_archive.entity.ArchiveRecord;
import com.jlmedaios.monolith.medical_records_archive.service.MedicalRecordsArchiveService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 病案室管理 Service 测试。
 */
@SpringBootTest
public class MedicalRecordsArchiveServiceTest {

    @Autowired
    private MedicalRecordsArchiveService medicalRecordsArchiveService;

    @Test
    void testStore() {
        ArchiveRecord record = medicalRecordsArchiveService.store(
                "MR2026100001", 1L, 1L, "住院病案", "密集架A-01-03"
        );
        assertNotNull(record.getId());
        assertEquals("IN_STOCK", record.getStatus());
    }

    @Test
    void testBorrowAndReturn() {
        ArchiveRecord record = medicalRecordsArchiveService.store(
                "MR2026100002", 2L, 2L, "门诊病案", "密集架B-02-05"
        );
        Optional<ArchiveRecord> borrowed = medicalRecordsArchiveService.borrow(
                record.getId(), "DOC001", LocalDate.now(), LocalDate.now().plusDays(7)
        );
        assertTrue(borrowed.isPresent());
        assertEquals("BORROWED", borrowed.get().getStatus());

        Optional<ArchiveRecord> returned = medicalRecordsArchiveService.returnRecord(record.getId());
        assertTrue(returned.isPresent());
        assertEquals("IN_STOCK", returned.get().getStatus());
        assertNull(returned.get().getBorrowerId());
    }

    @Test
    void testOverdueList() {
        ArchiveRecord record = medicalRecordsArchiveService.store(
                "MR2026100003", 3L, 3L, "急诊病案", "密集架C-03-07"
        );
        medicalRecordsArchiveService.borrow(
                record.getId(), "DOC002", LocalDate.now().minusDays(10), LocalDate.now().minusDays(3)
        );
        assertNotNull(medicalRecordsArchiveService.overdueList());
    }
}
