package com.sep490.backendclubmanagement.scheduled;

import com.sep490.backendclubmanagement.entity.Semester;
import com.sep490.backendclubmanagement.repository.SemesterRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SemesterScheduledJobTest {

    @Mock
    private SemesterRepository semesterRepository;

    @InjectMocks
    private SemesterScheduledJob semesterScheduledJob;

    private Semester currentSemester;
    private LocalDate today;

    @BeforeEach
    void setUp() {
        today = LocalDate.now();
        currentSemester = Semester.builder()
                .id(1L)
                .semesterName("Fall 2025")
                .semesterCode("FALL2025")
                .startDate(LocalDate.of(2025, 9, 1))
                .endDate(LocalDate.of(2025, 12, 31))
                .isCurrent(false)
                .build();
    }

    @Test
    void testUpdateCurrentSemester_WhenSemesterFound_AndNotCurrentYet() {
        // Given
        when(semesterRepository.findSemesterByDate(any(LocalDate.class)))
                .thenReturn(Optional.of(currentSemester));

        // When
        semesterScheduledJob.updateCurrentSemester();

        // Then
        verify(semesterRepository).findSemesterByDate(any(LocalDate.class));
        verify(semesterRepository).setAllSemestersNotCurrent();
        verify(semesterRepository).setCurrentSemester(currentSemester.getId());
    }

    @Test
    void testUpdateCurrentSemester_WhenSemesterFound_AndAlreadyCurrent() {
        // Given
        currentSemester.setIsCurrent(true);
        when(semesterRepository.findSemesterByDate(any(LocalDate.class)))
                .thenReturn(Optional.of(currentSemester));

        // When
        semesterScheduledJob.updateCurrentSemester();

        // Then
        verify(semesterRepository).findSemesterByDate(any(LocalDate.class));
        verify(semesterRepository, never()).setAllSemestersNotCurrent();
        verify(semesterRepository, never()).setCurrentSemester(anyLong());
    }

    @Test
    void testUpdateCurrentSemester_WhenNoSemesterFound() {
        // Given
        when(semesterRepository.findSemesterByDate(any(LocalDate.class)))
                .thenReturn(Optional.empty());

        // When
        semesterScheduledJob.updateCurrentSemester();

        // Then
        verify(semesterRepository).findSemesterByDate(any(LocalDate.class));
        verify(semesterRepository).setAllSemestersNotCurrent();
        verify(semesterRepository, never()).setCurrentSemester(anyLong());
    }

    @Test
    void testManualTrigger() {
        // Given
        when(semesterRepository.findSemesterByDate(any(LocalDate.class)))
                .thenReturn(Optional.of(currentSemester));

        // When
//        semesterScheduledJob.triggerManualUpdate();

        // Then
        verify(semesterRepository).findSemesterByDate(any(LocalDate.class));
        verify(semesterRepository).setAllSemestersNotCurrent();
        verify(semesterRepository).setCurrentSemester(currentSemester.getId());
    }
}

