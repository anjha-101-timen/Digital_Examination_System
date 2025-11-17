{
  "systemName": "Digital_Examination_System",
  "dataModelVersion": "1.0",
  "description": "Core entities derived from the analysis of all assessment management workflow images (1_create_exam_panel.png through 29_delete_exam.png).",
  
  "entities": [
    {
      "entityName": "ExamAssessment",
      "purpose": "Manages the overall configuration and scheduling of a test (Images 2, 3, 4, 6, 7, 8).",
      "fields": [
        {"fieldName": "examId", "dataType": "String", "description": "Primary identifier for the exam."},
        {"fieldName": "title", "dataType": "String", "sourceImages": ["2_title_branch_code_duration.png"]},
        {"fieldName": "examCode", "dataType": "String", "sourceImages": ["2_title_branch_code_duration.png"]},
        {"fieldName": "branch", "dataType": "String", "sourceImages": ["2_title_branch_code_duration.png"]},
        {"fieldName": "totalDurationMinutes", "dataType": "Number", "sourceImages": ["2_title_branch_code_duration.png", "3_minutes.png"]},
        {"fieldName": "timePerQuestionMinutes", "dataType": "Number", "sourceImages": ["5_time_per_questions.png"]},
        {"fieldName": "totalQuestions", "dataType": "Number", "sourceImages": ["4_total_questions.png"]},
        {"fieldName": "difficultyLevel", "dataType": "String", "sourceImages": ["6_level_marks_date_time.png"]},
        {"fieldName": "scheduledDateTime", "dataType": "DateTime", "sourceImages": ["6_level_marks_date_time.png"]},
        {"fieldName": "positiveMarks", "dataType": "Decimal", "sourceImages": ["6_level_marks_date_time.png"]},
        {"fieldName": "negativeMarks", "dataType": "Decimal", "sourceImages": ["6_level_marks_date_time.png"]},
        {"fieldName": "academicStructure", "dataType": "Array<Object>", "description": "List of sections/semesters and their question quotas (Image 7)."},
        {"fieldName": "questionFormatQuotas", "dataType": "Object", "description": "Breakdown of questions by type (MCQ, MSQ, NAT) (Image 8)."}
      ]
    },
    {
      "entityName": "Question",
      "purpose": "Stores the content and solution details for each assessment item (Images 11, 17, 18, 19, 20).",
      "fields": [
        {"fieldName": "questionId", "dataType": "String", "description": "Primary identifier for the question."},
        {"fieldName": "examId", "dataType": "String", "description": "Foreign key to ExamAssessment."},
        {"fieldName": "questionText", "dataType": "String", "sourceImages": ["11_i_questions_and_options.png"]},
        {"fieldName": "questionType", "dataType": "Enum", "allowedValues": ["MCQ", "MSQ", "NAT", "T/F"], "sourceImages": ["17_question_type.png"]},
        {"fieldName": "options", "dataType": "Array<String>", "sourceImages": ["11_i_questions_and_options.png"]},
        {"fieldName": "correctAnswer", "dataType": "Array<String|Number>", "description": "The stored solution, depending on questionType (Image 20)."},
        {"fieldName": "explanation", "dataType": "String", "sourceImages": ["18_question_explanation.png"]},
        {"fieldName": "hint", "dataType": "String", "sourceImages": ["19_hint_subject_topic.png"]},
        {"fieldName": "subjectTag", "dataType": "String", "sourceImages": ["19_hint_subject_topic.png"]},
        {"fieldName": "topicTag", "dataType": "String", "sourceImages": ["19_hint_subject_topic.png"]}
      ]
    },
    {
      "entityName": "AssessmentAttempt",
      "purpose": "Tracks a student's live attempt and final submission (Images 11, 25).",
      "fields": [
        {"fieldName": "attemptId", "dataType": "String", "description": "Primary identifier for the attempt."},
        {"fieldName": "examId", "dataType": "String", "description": "Foreign key to ExamAssessment."},
        {"fieldName": "userId", "dataType": "String", "description": "Foreign key to the User/Student entity (Implied)."},
        {"fieldName": "startTime", "dataType": "DateTime"},
        {"fieldName": "endTime", "dataType": "DateTime"},
        {"fieldName": "status", "dataType": "Enum", "allowedValues": ["Active", "Submitted", "Expired"]},
        {"fieldName": "answers", "dataType": "Array<Object>", "description": "User selections/answers mapped to question IDs."}
      ]
    },
    {
      "entityName": "UserAuthentication",
      "purpose": "Handles access control for administration and modification (Images 15, 16).",
      "fields": [
        {"fieldName": "userId", "dataType": "String"},
        {"fieldName": "username", "dataType": "String", "sourceImages": ["15_username_password.png"]},
        {"fieldName": "passwordHash", "dataType": "String"},
        {"fieldName": "role", "dataType": "Enum", "allowedValues": ["Admin", "Instructor", "Student"], "sourceImages": ["16_authentication_authorization.png"]}
      ]
    }
  ]
}
