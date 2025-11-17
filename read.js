// FIXED: No extra spaces in URLs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBTheLUNQAC_9ic4HflIAlXFIvawybkjpo",
  authDomain: "ofdigitalexamin.firebaseapp.com",
  projectId: "ofdigitalexamin",
  storageBucket: "ofdigitalexamin.firebasestorage.app",
  messagingSenderId: "1010482896632",
  appId: "1:1010482896632:web:ca8831b88e73749a84250d",
  measurementId: "G-8NLHDLEFE3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements (safe access)
  const examList = document.getElementById("examList");
  const questionViewer = document.getElementById("questionViewer");
  const questionPanel = document.getElementById("questionPanel");
  const mainTimerEl = document.getElementById("mainTimer");
  const questionTimerEl = document.getElementById("questionTimer");
  const currentQEl = document.getElementById("currentQ");
  const totalQEl = document.getElementById("totalQ");
  const questionTextEl = document.getElementById("questionText");
  const optionsContainer = document.getElementById("optionsContainer");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const savePrev = document.getElementById("savePrev");
  const saveNext = document.getElementById("saveNext");
  const submitBtn = document.getElementById("submitBtn");
  const leaveBtn = document.getElementById("leaveBtn");
  const markReviewBtn = document.getElementById("markReview");
  const clearBtn = document.getElementById("clearBtn");
  const questionGrid = document.getElementById("questionGrid");
  const sidebar = document.getElementById("sidebar");
  const questionMeta = document.getElementById("questionMeta");
  const questionTypeBadge = document.getElementById("questionTypeBadge");
  const difficultyBadge = document.getElementById("difficultyBadge");
  const questionSubject = document.getElementById("questionSubject");
  const questionTopic = document.getElementById("questionTopic");
  const positiveMarkEl = document.getElementById("positiveMark");
  const negativeMarkEl = document.getElementById("negativeMark");
  const examSubjectEl = document.getElementById("examSubject");
  const questionInfo = document.getElementById("questionInfo");
  const hintSection = document.getElementById("hintSection");
  const hintText = document.getElementById("hintText");
  const explanationSection = document.getElementById("explanationSection");
  const explanationText = document.getElementById("explanationText");
  const statusFeedback = document.getElementById("statusFeedback");
  const hintToggleButton = document.getElementById("hintToggleButton");

  // State
  let currentExam = null;
  let questions = [];
  let currentQIndex = 0;
  let mainTimer = 0;
  let questionTimer = 0;
  let mainTimerInterval = null;
  let questionTimerInterval = null;
  let userAnswers = [];
  let questionTimeLogs = [];
  let examSubject = "";
  let examTopic = "";
  let positiveMarking = 1;
  let negativeMarking = 0;
  let showHints = false;

  // === Load Exams from Firestore ===
  async function loadExams() {
    if (!examList) return;
    examList.innerHTML = '<p class="loading">Loading exams...</p>';

    try {
      const querySnapshot = await getDocs(collection(db, "exams"));
      examList.innerHTML = "";

      if (querySnapshot.size === 0) {
        examList.innerHTML = '<p class="loading">No exams found.</p>';
        return;
      }

      let examsHTML = '';

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const hasAttempt = data.userResponses && Object.keys(data.userResponses).length > 0;

        examsHTML += `
          <div class="exam-card" data-id="${doc.id}" data-name="${data.name}" 
               data-total="${data.totalQuestions || 1}">
            <h4>${data.name} <span class="tag">${data.level}</span></h4>
            <p><strong>Branch:</strong> ${data.branch}</p>
            <p><strong>Qs:</strong> ${data.totalQuestions || 1}</p>
            <p><strong>Marks:</strong> +${data.positiveMarks || 1}/-${data.negativeMarks || 0}</p>
            
            <div class="action-buttons">
              <button class="btn-resume" ${!hasAttempt ? 'disabled' : ''}>Resume Old</button>
              <button class="btn-new">Attempt New</button>
            </div>
          </div>
        `;
      });

      examList.innerHTML = examsHTML;

    } catch (error) {
      console.error("Failed to load exams:", error);
      examList.innerHTML = `<p class="error">Failed to load exams: ${error.message}</p>`;
    }
  }

  // === Event Delegation: Handle button clicks on exam cards ===
  examList?.addEventListener('click', async (e) => {
    const card = e.target.closest('.exam-card');
    if (!card) return;

    const examId = card.dataset.id;
    const examDoc = await getDoc(doc(db, "exams", examId));
    const data = examDoc.data();

    // Set exam-level marking and metadata
    positiveMarking = data.positiveMarks || 1;
    negativeMarking = data.negativeMarks || 0;
    examSubject = data.subject || "";
    examTopic = data.topic || "";

    if (e.target.classList.contains('btn-new')) {
      startExam(examId, data, false);
    }

    if (e.target.classList.contains('btn-resume') && !e.target.disabled) {
      startExam(examId, data, true);
    }
  });

  // === Start Exam ===
  async function startExam(examId, examData, resume = false) {
    currentExam = { id: examId, ...examData };
    const totalQuestions = examData.totalQuestions || 1;
    totalQEl.textContent = totalQuestions;
    
    // Store exam-level subject and topic
    examSubject = examData.subject || "";
    examTopic = examData.topic || "";
    positiveMarking = examData.positiveMarks || 1;
    negativeMarking = examData.negativeMarks || 0;
    
    // Update exam metadata display
    if (examSubjectEl) examSubjectEl.textContent = examSubject || "General";
    
    const examDoc = await getDoc(doc(db, "exams", examId));
    const examDataWithQs = examDoc.data();
    questions = [];

    for (let i = 1; i <= totalQuestions; i++) {
      const q = examDataWithQs.questions?.[`q${i}`] || {
        question: `Question ${i}`,
        type: "mcq",
        options: { A: '', B: '', C: '', D: '' },
        correct: null,
        explanation: "",
        subject: examSubject,
        topic: examTopic,
        positiveMarking: positiveMarking,
        negativeMarking: negativeMarking
      };
      questions.push(q);
    }

    userAnswers = Array(totalQuestions).fill(null);
    questionTimeLogs = Array(totalQuestions).fill(0);

    if (resume && examDataWithQs.userResponses) {
      for (let i = 0; i < totalQuestions; i++) {
        userAnswers[i] = examDataWithQs.userResponses[`q${i + 1}`] || null;
      }
      if (examDataWithQs.questionTimeLogs) {
        questionTimeLogs = examDataWithQs.questionTimeLogs;
      }
    }

    currentQIndex = 0;
    showQuestion();
    startMainTimer();
    createQuestionGrid();

    // Hide exam list, show question viewer and panel
    examList.style.display = 'none';
    questionViewer.style.display = 'flex';
    questionPanel.style.display = 'flex';
    sidebar.style.display = 'none';

    document.querySelector('.main-content h2').textContent = `${currentExam.name}`;
  }

  // === Create Dynamic Question Grid ===
  function createQuestionGrid() {
    if (!questionGrid) return;
    questionGrid.innerHTML = "";
    const totalQuestions = currentExam.totalQuestions || 1;
    const cols = Math.min(10, Math.max(5, Math.floor(Math.sqrt(totalQuestions))));
    questionGrid.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

    for (let i = 1; i <= totalQuestions; i++) {
      const btn = document.createElement("button");
      btn.className = "question-btn";
      btn.textContent = i;
      btn.dataset.index = i - 1;
      btn.addEventListener('click', () => {
        saveAnswer(currentQIndex);
        currentQIndex = parseInt(btn.dataset.index);
        showQuestion();
      });
      questionGrid.appendChild(btn);
    }

    // Initial status update
    questions.forEach((_, i) => updateQuestionStatus(i));
  }

  // === Update Question Button Status ===
  function updateQuestionStatus(index) {
    const btn = questionGrid?.children[index];
    if (!btn) return;

    btn.classList.remove('saved', 'attempted', 'review');

    if (userAnswers[index]?.reviewed) {
      btn.classList.add('review');
    } else if (userAnswers[index]?.answer !== null && userAnswers[index]?.answer !== undefined) {
      btn.classList.add('saved');
    } else if (document.querySelector(`#optionsContainer .option input:checked`)) {
      btn.classList.add('attempted');
    }
  }

  // === Start Main Timer (HH:MM:SS) ===
  function startMainTimer() {
    const totalSeconds = (currentExam.timePerQuestion || 60) * (currentExam.totalQuestions || 1);
    mainTimer = totalSeconds;

    mainTimerInterval = setInterval(() => {
      mainTimer--;
      const hours = Math.floor(mainTimer / 3600).toString().padStart(2, '0');
      const mins = Math.floor((mainTimer % 3600) / 60).toString().padStart(2, '0');
      const secs = (mainTimer % 60).toString().padStart(2, '0');
      mainTimerEl.textContent = `${hours}:${mins}:${secs}`;

      if (mainTimer <= 0) {
        clearInterval(mainTimerInterval);
        clearInterval(questionTimerInterval);
        alert("Time's up! Submitting exam...");
        submitExam();
      }
    }, 1000);
  }

  // === Start Per-Question Timer ===
  function startQuestionTimer() {
    clearInterval(questionTimerInterval);
    questionTimer = questionTimeLogs[currentQIndex] || 0;

    questionTimerInterval = setInterval(() => {
      questionTimer++;
      const mins = Math.floor(questionTimer / 60).toString().padStart(2, '0');
      const secs = (questionTimer % 60).toString().padStart(2, '0');
      questionTimerEl.textContent = `${mins}:${secs}`;
    }, 1000);
  }

  // === Pause Question Timer ===
  function pauseQuestionTimer() {
    clearInterval(questionTimerInterval);
    questionTimeLogs[currentQIndex] = questionTimer;
  }

  // === Show Question ===
  function showQuestion() {
    if (currentQIndex >= questions.length || currentQIndex < 0) return;

    pauseQuestionTimer();

    const q = questions[currentQIndex];
    currentQEl.textContent = currentQIndex + 1;
    
    // Update question metadata
    if (questionMeta) {
      questionMeta.style.display = "flex";
      
      // Update question type badge
      if (questionTypeBadge) {
        questionTypeBadge.textContent = q.type.toUpperCase();
        questionTypeBadge.className = "question-type-badge";
        questionTypeBadge.classList.add(`type-${q.type}`);
      }
      
      // Update difficulty badge
      if (difficultyBadge) {
        difficultyBadge.textContent = q.difficulty ? q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1) : "Medium";
        difficultyBadge.className = "difficulty-badge";
        difficultyBadge.classList.add(`difficulty-${q.difficulty || 'medium'}`);
      }
      
      // Update subject and topic
      if (questionSubject) {
        questionSubject.textContent = q.subject || examSubject || "General";
      }
      
      if (questionTopic) {
        questionTopic.textContent = q.topic || examTopic || "General";
      }
      
      // Update marking system
      if (positiveMarkEl) {
        positiveMarkEl.textContent = q.positiveMarking || positiveMarking || 1;
      }
      
      if (negativeMarkEl) {
        negativeMarkEl.textContent = q.negativeMarking || negativeMarking || 0;
      }
    }

    // Display question text
    questionTextEl.innerHTML = q.question || "No question text";

    // Render options based on question type
    renderQuestionOptions(q);

    // Update navigation buttons
    if (prevBtn) prevBtn.disabled = currentQIndex === 0;
    if (nextBtn) nextBtn.disabled = currentQIndex === questions.length - 1;
    if (savePrev) savePrev.disabled = currentQIndex === 0;
    if (saveNext) saveNext.disabled = currentQIndex === questions.length - 1;

    updateQuestionStatus(currentQIndex);
    startQuestionTimer();
    
    // Update mark for review button state
    if (markReviewBtn && userAnswers[currentQIndex]) {
      if (userAnswers[currentQIndex].reviewed) {
        markReviewBtn.classList.add('active');
        markReviewBtn.textContent = 'Marked for Review';
      } else {
        markReviewBtn.classList.remove('active');
        markReviewBtn.textContent = 'Mark for Review';
      }
    }
  }

  // === Render Question Options Based on Type ===
  function renderQuestionOptions(q) {
    optionsContainer.innerHTML = "";
    
    // Update explanation section if available
    if (explanationSection && explanationText) {
      if (q.explanation) {
        explanationText.textContent = q.explanation;
        explanationSection.style.display = "block";
      } else {
        explanationSection.style.display = "none";
      }
    }
    
    // Handle different question types
    switch (q.type) {
      case "mcq":
        renderMCQOptions(q);
        break;
      case "msq":
        renderMSQOptions(q);
        break;
      case "nat":
        renderNATOptions(q);
        break;
      default:
        renderMCQOptions(q); // Fallback to MCQ
    }
    
    // Update hint section if available
    if (hintSection && hintText) {
      if (q.hint && showHints) {
        hintText.textContent = q.hint;
        hintSection.style.display = "block";
      } else {
        hintSection.style.display = "none";
      }
    }
  }

  // === Render MCQ Options ===
  function renderMCQOptions(q) {
    const options = q.options || { A: '', B: '', C: '', D: '' };
    const optionKeys = Object.keys(options);
    const selectedAnswer = userAnswers[currentQIndex]?.answer || null;
    
    optionKeys.forEach((key) => {
      if (!options[key]) return; // Skip empty options
      
      const div = document.createElement("div");
      div.className = "option";
      div.innerHTML = `
        <div class="option-group">
          <label>
            <input type="radio" name="mcq-option" value="${key}" 
                   ${selectedAnswer === key ? 'checked' : ''}>
            <span class="option-letter">${key}</span>
            <span class="option-text">${options[key]}</span>
          </label>
        </div>
      `;
      
      const radio = div.querySelector('input');
      if (radio) {
        radio.addEventListener('change', (e) => {
          userAnswers[currentQIndex] = { 
            answer: e.target.value, 
            reviewed: userAnswers[currentQIndex]?.reviewed || false 
          };
          updateQuestionStatus(currentQIndex);
          saveAnswer(currentQIndex);
        });
      }
      
      optionsContainer.appendChild(div);
    });
  }

  // === Render MSQ Options ===
  function renderMSQOptions(q) {
    const options = q.options || { A: '', B: '', C: '', D: '' };
    const optionKeys = Object.keys(options);
    const selectedAnswers = userAnswers[currentQIndex]?.answer || [];
    
    optionKeys.forEach((key) => {
      if (!options[key]) return; // Skip empty options
      
      const div = document.createElement("div");
      div.className = "option";
      div.innerHTML = `
        <div class="option-group">
          <label>
            <input type="checkbox" name="msq-option" value="${key}" 
                   ${Array.isArray(selectedAnswers) && selectedAnswers.includes(key) ? 'checked' : ''}>
            <span class="option-letter">${key}</span>
            <span class="option-text">${options[key]}</span>
          </label>
        </div>
      `;
      
      const checkbox = div.querySelector('input');
      if (checkbox) {
        checkbox.addEventListener('change', (e) => {
          let currentAnswers = userAnswers[currentQIndex]?.answer || [];
          if (!Array.isArray(currentAnswers)) currentAnswers = [];
          
          if (e.target.checked) {
            currentAnswers = [...new Set([...currentAnswers, key])];
          } else {
            currentAnswers = currentAnswers.filter(a => a !== key);
          }
          
          userAnswers[currentQIndex] = { 
            answer: currentAnswers, 
            reviewed: userAnswers[currentQIndex]?.reviewed || false 
          };
          updateQuestionStatus(currentQIndex);
          saveAnswer(currentQIndex);
        });
      }
      
      optionsContainer.appendChild(div);
    });
  }

  // === Render NAT Options ===
  function renderNATOptions(q) {
    const div = document.createElement("div");
    div.className = "option";
    div.innerHTML = `
      <div class="nat-container">
        <input type="text" class="nat-answer" 
               placeholder="Enter numerical answer" 
               value="${userAnswers[currentQIndex]?.answer || ''}">
      </div>
    `;
    
    const input = div.querySelector('.nat-answer');
    if (input) {
      input.addEventListener('input', (e) => {
        userAnswers[currentQIndex] = { 
          answer: e.target.value, 
          reviewed: userAnswers[currentQIndex]?.reviewed || false 
        };
        updateQuestionStatus(currentQIndex);
        saveAnswer(currentQIndex);
      });
    }
    
    optionsContainer.appendChild(div);
  }

  // === Save Answer ===
  async function saveAnswer(index) {
    if (!currentExam) return;
    
    try {
      await updateDoc(doc(db, "exams", currentExam.id), {
        [`userResponses.q${index + 1}`]: userAnswers[index],
        questionTimeLogs: questionTimeLogs
      });
      
      // Add visual feedback
      if (statusFeedback) {
        statusFeedback.textContent = "✓ Answer saved successfully!";
        statusFeedback.className = "save-feedback success show";
        
        setTimeout(() => {
          statusFeedback.classList.remove('show');
          setTimeout(() => {
            statusFeedback.className = "save-feedback";
          }, 300);
        }, 2000);
      }
    } catch (error) {
      console.error("Failed to save answer:", error);
      
      // Add error feedback
      if (statusFeedback) {
        statusFeedback.textContent = "✗ Failed to save answer. Please try again.";
        statusFeedback.className = "save-feedback error show";
        
        setTimeout(() => {
          statusFeedback.classList.remove('show');
          setTimeout(() => {
            statusFeedback.className = "save-feedback";
          }, 300);
        }, 2500);
      }
    }
  }

  // === Toggle Hints ===
  function toggleHints() {
    showHints = !showHints;
    
    // Update button text
    if (hintToggleButton) {
      hintToggleButton.textContent = showHints ? "Hide Hints" : "Show Hints";
      hintToggleButton.classList.toggle("active", showHints);
    }
    
    // Re-render current question to show/hide hints
    showQuestion();
  }

  // === Navigation ===
  prevBtn?.addEventListener('click', () => {
    if (currentQIndex > 0) {
      currentQIndex--;
      showQuestion();
    }
  });

  nextBtn?.addEventListener('click', () => {
    if (currentQIndex < questions.length - 1) {
      currentQIndex++;
      showQuestion();
    }
  });

  savePrev?.addEventListener('click', () => {
    if (currentQIndex > 0) {
      saveAnswer(currentQIndex);
      currentQIndex--;
      showQuestion();
    }
  });

  saveNext?.addEventListener('click', () => {
    if (currentQIndex < questions.length - 1) {
      saveAnswer(currentQIndex);
      currentQIndex++;
      showQuestion();
    }
  });

  // === Clear Answer ===
  clearBtn?.addEventListener('click', () => {
    const q = questions[currentQIndex];
    
    switch (q.type) {
      case "mcq":
        const radio = document.querySelector('.option input:checked');
        if (radio) radio.checked = false;
        break;
      case "nat":
        const inputField = document.querySelector('.nat-answer');
        if (inputField) inputField.value = '';
        break;
      case "msq":
        document.querySelectorAll('.option input:checked').forEach(input => {
          input.checked = false;
        });
        break;
    }
    
    userAnswers[currentQIndex] = { 
      answer: q.type === "msq" ? [] : null, 
      reviewed: userAnswers[currentQIndex]?.reviewed || false 
    };
    
    updateQuestionStatus(currentQIndex);
    saveAnswer(currentQIndex);
  });

  // === Mark for Review ===
  markReviewBtn?.addEventListener('click', () => {
    if (!userAnswers[currentQIndex]) {
      userAnswers[currentQIndex] = { 
        answer: null, 
        reviewed: true 
      };
    } else {
      userAnswers[currentQIndex].reviewed = !userAnswers[currentQIndex].reviewed;
    }

    if (userAnswers[currentQIndex].reviewed) {
      markReviewBtn.classList.add('active');
      markReviewBtn.textContent = 'Marked for Review';
    } else {
      markReviewBtn.classList.remove('active');
      markReviewBtn.textContent = 'Mark for Review';
    }

    updateQuestionStatus(currentQIndex);
    saveAnswer(currentQIndex);
  });

  // === Toggle Hints Button ===
  hintToggleButton?.addEventListener('click', toggleHints);

  // === Leave Exam ===
  leaveBtn?.addEventListener('click', async () => {
    pauseQuestionTimer();
    await saveAnswer(currentQIndex);
    alert("Progress saved! You can resume later.");
    location.reload();
  });

  // === Submit Exam ===
  async function submitExam() {
    clearInterval(mainTimerInterval);
    clearInterval(questionTimerInterval);
    try {
      await updateDoc(doc(db, "exams", currentExam.id), {
        submitted: true,
        submittedAt: new Date().toISOString(),
        totalQuestions: currentExam.totalQuestions,
        userAnswers: userAnswers,
        questionTimeLogs: questionTimeLogs
      });
      alert("Exam submitted successfully!");
      location.reload();
    } catch (error) {
      console.error("Submit failed:", error);
      alert("Submit failed: " + error.message);
    }
  }

  submitBtn?.addEventListener('click', submitExam);

  // === Load on Page Load ===
  loadExams();
});