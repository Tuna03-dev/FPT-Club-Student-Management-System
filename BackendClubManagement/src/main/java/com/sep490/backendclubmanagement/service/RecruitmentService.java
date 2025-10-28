package com.sep490.backendclubmanagement.service;

import com.sep490.backendclubmanagement.dto.request.*;
import com.sep490.backendclubmanagement.dto.response.*;
import com.sep490.backendclubmanagement.entity.*;
import com.sep490.backendclubmanagement.exception.AppException;
import com.sep490.backendclubmanagement.exception.ErrorCode;
import com.sep490.backendclubmanagement.mapper.RecruitmentApplicationMapper;
import com.sep490.backendclubmanagement.mapper.RecruitmentMapper;
import com.sep490.backendclubmanagement.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class RecruitmentService implements RecruitmentServiceInterface {

    private final RecruitmentRepository recruitmentRepository;
    private final RecruitmentApplicationRepository applicationRepository;
    private final RecruitmentFormQuestionRepository questionRepository;
    private final RecruitmentFormAnswerRepository answerRepository;
    private final QuestionOptionRepository questionOptionRepository;
    private final TeamOptionRepository teamOptionRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final EventRepository eventRepository; // placeholder if needed later
    private final RecruitmentMapper recruitmentMapper;
    private final RecruitmentApplicationMapper recruitmentApplicationMapper;
    private final CloudinaryService cloudinaryService;

    @Override
    public PagedResponse<RecruitmentData> listRecruitments(Long clubId, RecruitmentStatus status, Pageable pageable) {
        Page<Recruitment> page = (status == null)
                ? recruitmentRepository.findByClub_Id(clubId, pageable)
                : recruitmentRepository.findByClub_IdAndStatus(clubId, status, pageable);
        Page<RecruitmentData> dataPage = page.map(recruitmentMapper::toDto);
        return PagedResponse.of(dataPage);
    }

    @Override
    public RecruitmentData getRecruitment(Long id) throws AppException {
        Recruitment r = recruitmentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        // Load questions with options to include in the response
        List<RecruitmentFormQuestion> questions = questionRepository.findByRecruitment_IdOrderByQuestionOrderAsc(r.getId());
        
        // Load options for each question
        for (RecruitmentFormQuestion question : questions) {
            List<QuestionOption> options = questionOptionRepository.findByQuestion_IdOrderByOptionOrderAsc(question.getId());
            question.setOptions(options.stream().collect(java.util.stream.Collectors.toSet()));
        }
        
        r.setFormQuestions(questions.stream().collect(java.util.stream.Collectors.toSet()));
        
        // Load team options
        List<TeamOption> teamOptions = teamOptionRepository.findByRecruitment_Id(r.getId());
        r.setTeamOptions(teamOptions.stream().collect(java.util.stream.Collectors.toSet()));
        
        return recruitmentMapper.toDto(r);
    }

    @Override
    @Transactional
    public RecruitmentData createRecruitment(Long clubId, RecruitmentCreateRequest req) {
        Recruitment r = recruitmentMapper.toEntity(req, clubId);
        r = recruitmentRepository.save(r);
        upsertQuestions(r, req.questions);
        upsertTeamOptions(r, req.teamOptionIds);
        
        List<RecruitmentFormQuestion> questions = questionRepository.findByRecruitment_IdOrderByQuestionOrderAsc(r.getId());
        // Load options for each question
        for (RecruitmentFormQuestion question : questions) {
            List<QuestionOption> options = questionOptionRepository.findByQuestion_IdOrderByOptionOrderAsc(question.getId());
            question.setOptions(options.stream().collect(java.util.stream.Collectors.toSet()));
        }
        r.setFormQuestions(questions.stream().collect(java.util.stream.Collectors.toSet()));
        
        // Load team options
        List<TeamOption> teamOptions = teamOptionRepository.findByRecruitment_Id(r.getId());
        r.setTeamOptions(teamOptions.stream().collect(java.util.stream.Collectors.toSet()));
        
        return recruitmentMapper.toDto(r);
    }

    @Override
    @Transactional
    public RecruitmentData updateRecruitment(Long id, RecruitmentUpdateRequest req) throws AppException {
        Recruitment r = recruitmentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        // Check if recruitment is closed
        if (r.getStatus() == RecruitmentStatus.CLOSED) {
            throw new AppException(ErrorCode.RECRUITMENT_CLOSED);
        }
        
        recruitmentMapper.updateEntity(r, req);
        recruitmentRepository.save(r);
        upsertQuestions(r, req.questions);
        upsertTeamOptions(r, req.teamOptionIds);
        
        List<RecruitmentFormQuestion> questions = questionRepository.findByRecruitment_IdOrderByQuestionOrderAsc(r.getId());
        // Load options for each question
        for (RecruitmentFormQuestion question : questions) {
            List<QuestionOption> options = questionOptionRepository.findByQuestion_IdOrderByOptionOrderAsc(question.getId());
            question.setOptions(options.stream().collect(java.util.stream.Collectors.toSet()));
        }
        r.setFormQuestions(questions.stream().collect(java.util.stream.Collectors.toSet()));
        
        // Load team options
        List<TeamOption> teamOptions = teamOptionRepository.findByRecruitment_Id(r.getId());
        r.setTeamOptions(teamOptions.stream().collect(java.util.stream.Collectors.toSet()));
        
        return recruitmentMapper.toDto(r);
    }

    @Override
    @Transactional
    public void changeRecruitmentStatus(Long id, RecruitmentStatus status) throws AppException {
        Recruitment r = recruitmentRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        r.setStatus(status);
        recruitmentRepository.save(r);
    }

    @Override
    @Transactional
    public void deleteRecruitment(Long id) {
        recruitmentRepository.deleteById(id);
    }

    @Override
    public PagedResponse<RecruitmentApplicationData> listApplications(Long recruitmentId, RecruitmentApplicationStatus status, Pageable pageable) {
        Page<RecruitmentApplication> page = (status == null)
                ? applicationRepository.findByRecruitment_Id(recruitmentId, pageable)
                : applicationRepository.findByRecruitment_IdAndStatus(recruitmentId, status, pageable);
        Page<RecruitmentApplicationData> dataPage = page.map(recruitmentApplicationMapper::toDto);
        return PagedResponse.of(dataPage);
    }

    @Override
    public PagedResponse<RecruitmentApplicationData> listMyApplications(Long applicantId, RecruitmentApplicationStatus status, Pageable pageable) {
        Page<RecruitmentApplication> page = (status == null)
                ? applicationRepository.findByApplicant_Id(applicantId, pageable)
                : applicationRepository.findByApplicant_IdAndStatus(applicantId, status, pageable);
        Page<RecruitmentApplicationData> dataPage = page.map(recruitmentApplicationMapper::toDto);
        return PagedResponse.of(dataPage);
    }

    @Override
    @Transactional
    public RecruitmentApplicationData submitApplication(Long applicantId, ApplicationSubmitRequest req) throws AppException {
        return submitApplication(applicantId, req, null);
    }

    /**
     * Submit application with file upload support
     * @param applicantId User ID of the applicant
     * @param req Application submit request
     * @param allFiles MultiValueMap containing files with keys like "file_<questionId>"
     * @return Submitted application data
     * @throws AppException if submission fails
     */
    @Transactional
    public RecruitmentApplicationData submitApplication(Long applicantId, ApplicationSubmitRequest req, MultiValueMap<String, MultipartFile> allFiles) throws AppException {
        Recruitment recruitment = recruitmentRepository.findById(req.recruitmentId)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        User applicant = userRepository.findById(applicantId)
                .orElseThrow(() -> new AppException(ErrorCode.UNAUTHORIZED));

        RecruitmentApplication app = RecruitmentApplication.builder()
                .recruitment(recruitment)
                .applicant(applicant)
                .teamId(req.teamId)
                .status(RecruitmentApplicationStatus.UNDER_REVIEW)
                .submittedDate(LocalDateTime.now())
                .build();
        app = applicationRepository.save(app);

        // Build a map of questionId -> uploaded file URL
        Map<Long, String> uploadedFileUrls = new HashMap<>();
        if (allFiles != null && !allFiles.isEmpty()) {
            // Parse files with format "file_<questionId>"
            for (Map.Entry<String, List<MultipartFile>> entry : allFiles.entrySet()) {
                String key = entry.getKey();
                
                // Skip non-file fields (like "request")
                if (!key.startsWith("file_")) {
                    continue;
                }
                
                try {
                    // Extract questionId from key "file_<questionId>"
                    Long questionId = Long.parseLong(key.substring(5));
                    List<MultipartFile> files = entry.getValue();
                    
                    if (files != null && !files.isEmpty()) {
                        MultipartFile file = files.get(0); // Take first file
                        if (file != null && !file.isEmpty()) {
                            // Upload to Cloudinary
                            CloudinaryService.UploadResult uploadResult = cloudinaryService.uploadFile(file);
                            uploadedFileUrls.put(questionId, uploadResult.url());
                        }
                    }
                } catch (NumberFormatException e) {
                    // Invalid questionId format, skip
                    continue;
                } catch (Exception e) {
                    throw new AppException(ErrorCode.INTERNAL_SERVER_ERROR);
                }
            }
        }

        List<RecruitmentFormAnswer> answers = new ArrayList<>();
        for (ApplicationSubmitRequest.FormAnswerRequest a : req.answers) {
            String fileUrl = a.fileUrl;
            
            // If file was uploaded for this question, use the uploaded URL
            if (uploadedFileUrls.containsKey(a.questionId)) {
                fileUrl = uploadedFileUrls.get(a.questionId);
            }
            
            RecruitmentFormAnswer ans = RecruitmentFormAnswer.builder()
                    .application(app)
                    .question(RecruitmentFormQuestion.builder().id(a.questionId).build())
                    .answerText(a.answerText)
                    .fileUrl(fileUrl)
                    .build();
            answers.add(ans);
        }
        answerRepository.saveAll(answers);

        return getApplication(app.getId());
    }

    @Override
    public RecruitmentApplicationData getApplication(Long applicationId) throws AppException {
        RecruitmentApplication app = applicationRepository.findById(applicationId)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        
        List<RecruitmentFormAnswer> answers = answerRepository.findByApplication_Id(applicationId);
        app.setAnswers(answers.stream().collect(java.util.stream.Collectors.toSet()));
        
        return recruitmentApplicationMapper.toDto(app);
    }

    @Override
    @Transactional
    public RecruitmentApplicationData reviewApplication(ApplicationReviewRequest req) throws AppException {
        RecruitmentApplication app = applicationRepository.findById(req.applicationId)
                .orElseThrow(() -> new AppException(ErrorCode.INTERNAL_SERVER_ERROR));
        app.setStatus(req.status);
        app.setReviewNotes(req.reviewNotes);
        app.setReviewedDate(LocalDateTime.now());
        applicationRepository.save(app);
        return getApplication(app.getId());
    }


    private void upsertQuestions(Recruitment recruitment, List<RecruitmentQuestionRequest> reqs) {
        if (reqs == null) return;
        
        // Get existing questions
        List<RecruitmentFormQuestion> existingQuestions = questionRepository.findByRecruitment_IdOrderByQuestionOrderAsc(recruitment.getId());
        
        // Collect IDs of questions that should be kept
        Set<Long> requestedQuestionIds = reqs.stream()
                .map(q -> q.id)
                .filter(id -> id != null)
                .collect(java.util.stream.Collectors.toSet());
        
        // Delete questions that are not in the request (orphaned questions)
        for (RecruitmentFormQuestion existingQuestion : existingQuestions) {
            if (!requestedQuestionIds.contains(existingQuestion.getId())) {
                // Delete options first
                questionOptionRepository.findByQuestion_IdOrderByOptionOrderAsc(existingQuestion.getId())
                        .forEach(option -> questionOptionRepository.deleteById(option.getId()));
                // Then delete question
                questionRepository.deleteById(existingQuestion.getId());
            }
        }

        // Create or update questions
        for (RecruitmentQuestionRequest q : reqs) {
            RecruitmentFormQuestion entity;
            
            if (q.id != null) {
                // UPDATE existing question
                entity = questionRepository.findById(q.id)
                        .orElseThrow(() -> new RuntimeException("Question not found: " + q.id));
                entity.setQuestionText(q.questionText);
                entity.setQuestionType(q.questionType);
                entity.setQuestionOrder(q.questionOrder);
                entity = questionRepository.save(entity);
                
                // Delete old options and create new ones
                questionOptionRepository.findByQuestion_IdOrderByOptionOrderAsc(entity.getId())
                        .forEach(option -> questionOptionRepository.deleteById(option.getId()));
            } else {
                // CREATE new question
                entity = RecruitmentFormQuestion.builder()
                        .questionText(q.questionText)
                        .questionType(q.questionType)
                        .questionOrder(q.questionOrder)
                        .recruitment(recruitment)
                        .build();
                entity = questionRepository.save(entity);
            }
            
            // Save question options if provided
            if (q.options != null && !q.options.isEmpty()) {
                saveQuestionOptions(entity, q.options);
            }
        }
    }

    private void saveQuestionOptions(RecruitmentFormQuestion question, List<String> options) {
        for (int i = 0; i < options.size(); i++) {
            QuestionOption option = QuestionOption.builder()
                    .optionText(options.get(i))
                    .optionOrder(i + 1)
                    .question(question)
                    .build();
            questionOptionRepository.save(option);
        }
    }

    private void upsertTeamOptions(Recruitment recruitment, List<Long> teamIds) {
        // Validate teamIds is not null or empty (should be enforced by validation, but double-check)
        if (teamIds == null || teamIds.isEmpty()) {
            throw new RuntimeException("teamOptionIds không được để trống. Phải chọn ít nhất một phòng ban.");
        }
        
        // Get existing team options
        List<TeamOption> existingTeamOptions = teamOptionRepository.findByRecruitment_Id(recruitment.getId());
        
        // Extract existing team IDs
        Set<Long> existingTeamIds = existingTeamOptions.stream()
                .map(teamOption -> teamOption.getTeam().getId())
                .collect(java.util.stream.Collectors.toSet());
        
        // Convert request team IDs to set
        Set<Long> requestedTeamIds = new java.util.HashSet<>(teamIds);
        
        // Delete team options that are not in the request (orphaned team options)
        for (TeamOption existingTeamOption : existingTeamOptions) {
            if (!requestedTeamIds.contains(existingTeamOption.getTeam().getId())) {
                teamOptionRepository.deleteById(existingTeamOption.getId());
            }
        }
        
        // Create new team options that are not in existing
        for (Long teamId : requestedTeamIds) {
            if (!existingTeamIds.contains(teamId)) {
                // Verify team exists
                Team team = teamRepository.findById(teamId)
                        .orElseThrow(() -> new RuntimeException("Team not found: " + teamId));
                
                TeamOption teamOption = TeamOption.builder()
                        .recruitment(recruitment)
                        .team(team)
                        .build();
                teamOptionRepository.save(teamOption);
            }
        }
    }

}


