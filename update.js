// ✅ FIXED: NO TRAILING SPACES IN URLS (CRITICAL FIX)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, getDoc, updateDoc, deleteField } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// ✅ Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBTheLUNQAC_9ic4HflIAlXFIvawybkjpo",
  authDomain: "ofdigitalexamin.firebaseapp.com",
  projectId: "ofdigitalexamin",
  storageBucket: "ofdigitalexamin.firebasestorage.app",
  messagingSenderId: "1010482896632",
  appId: "1:1010482896632:web:ca8831b88e73749a84250d",
  measurementId: "G-8NLHDLEFE3"
};

// ✅ Initialize Firebase with robust error handling
let app, db;
try {
  console.log("🔧 Initializing Firebase...");
  app = initializeApp(firebaseConfig);
  console.log("✅ Firebase app initialized");
  db = getFirestore(app);
  console.log("✅ Firestore initialized with project:", firebaseConfig.projectId);
} catch (error) {
  console.error("❌ CRITICAL ERROR: Firebase init failed:", error);
  alert(`Failed to connect to database. Error: ${error.message}`);
  throw error;
}

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const examSelect = document.getElementById("examSelect");
  const questionsContainer = document.getElementById("questionsContainer");
  const addQuestionBtn = document.getElementById("addQuestionBtn");
  const examInfo = document.getElementById("examInfo");
  
  // Initialize navigation controls dynamically
  const { 
    prevQuestionBtn, 
    nextQuestionBtn, 
    questionCounter,
    totalQuestionsElement,
    saveStatus 
  } = initNavigationControls();
  
  // State
  let currentExamId = null;
  let totalQuestions = 0;
  let currentQuestionIndex = 0;
  let saveTimeout = null;
  let isSaving = false;
  let currentSubject = "";
  let currentTopic = "";
  let isAuthenticated = false;
  let pendingExamId = null;
  
  // Add login modal to the page
  initLoginModal();
  
  // Question types definition (only keeping MCQ, MSQ, and NAT)
  const questionTypes = {
    mcq: {
      label: "Multiple Choice Question",
      description: "Select one correct option",
      createUI: (data = {}) => {
        let html = '';
        const options = data.options || { A: '', B: '', C: '', D: '' };
        const optionKeys = Object.keys(options);
        
        optionKeys.forEach(key => {
          const isChecked = data.correct === key ? 'checked' : '';
          html += `
            <div class="option-group">
              <div class="option-control">
                <input type="radio" id="option-${key}-${Date.now()}" name="mcq-option-${Date.now()}" value="${key}" ${isChecked}>
                <label for="option-${key}-${Date.now()}" class="option-letter">${key}</label>
              </div>
              <div class="option-input-container">
                <div class="option-text" contenteditable="true" placeholder="Option ${key}">${options[key] || ''}</div>
              </div>
            </div>`;
        });
        
        return html;
      },
      getCleanData: (existingData) => ({
        question: existingData.question || '',
        explanation: existingData.explanation || '',
        hint: existingData.hint || '',
        type: "mcq",
        options: existingData.options || { A: '', B: '', C: '', D: '' },
        correct: existingData.correct || null,
        subject: existingData.subject || currentSubject,
        topic: existingData.topic || currentTopic,
        positiveMarking: existingData.positiveMarking || 1,
        negativeMarking: existingData.negativeMarking || 0,
        difficulty: existingData.difficulty || 'medium',
        updatedAt: new Date().toISOString()
      })
    },
    
    msq: {
      label: "Multiple Select Question",
      description: "Select all correct options",
      createUI: (data = {}) => {
        let html = '';
        const options = data.options || { A: '', B: '', C: '', D: '' };
        const optionKeys = Object.keys(options);
        const correctOptions = Array.isArray(data.correct) ? data.correct : [];
        
        optionKeys.forEach(key => {
          const isChecked = correctOptions.includes(key) ? 'checked' : '';
          html += `
            <div class="option-group">
              <div class="option-control">
                <input type="checkbox" id="option-${key}-${Date.now()}" name="msq-option-${Date.now()}" value="${key}" ${isChecked}>
                <label for="option-${key}-${Date.now()}" class="option-letter">${key}</label>
              </div>
              <div class="option-input-container">
                <div class="option-text" contenteditable="true" placeholder="Option ${key}">${options[key] || ''}</div>
              </div>
            </div>`;
        });
        
        return html;
      },
      getCleanData: (existingData) => ({
        question: existingData.question || '',
        explanation: existingData.explanation || '',
        hint: existingData.hint || '',
        type: "msq",
        options: existingData.options || { A: '', B: '', C: '', D: '' },
        correct: Array.isArray(existingData.correct) ? existingData.correct : [],
        subject: existingData.subject || currentSubject,
        topic: existingData.topic || currentTopic,
        positiveMarking: existingData.positiveMarking || 1,
        negativeMarking: existingData.negativeMarking || 0,
        difficulty: existingData.difficulty || 'medium',
        updatedAt: new Date().toISOString()
      })
    },
    
    nat: {
      label: "Numerical Answer Type",
      description: "Enter a numerical answer",
      createUI: (data = {}) => `
        <div class="nat-container">
          <input type="text" class="nat-answer" placeholder="Enter correct numerical answer" value="${data.correct || ''}">
        </div>
        <div class="hint-section">
          <div class="hint-text" contenteditable="true" placeholder="Hint for students (optional)">${data.hint || ''}</div>
        </div>`,
      getCleanData: (existingData) => ({
        question: existingData.question || '',
        explanation: existingData.explanation || '',
        hint: existingData.hint || '',
        type: "nat",
        correct: existingData.correct || '',
        subject: existingData.subject || currentSubject,
        topic: existingData.topic || currentTopic,
        positiveMarking: existingData.positiveMarking || 1,
        negativeMarking: existingData.negativeMarking || 0,
        difficulty: existingData.difficulty || 'medium',
        updatedAt: new Date().toISOString()
      })
    }
  };

  // Positive marking options
  const positiveMarkingOptions = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5];
  
  // Negative marking options as fractions
  const negativeMarkingOptions = [
    { value: 0.5, label: "1/2" },
    { value: 0.33, label: "1/3" },
    { value: 0.25, label: "1/4" },
    { value: 0.2, label: "1/5" },
    { value: 0.67, label: "2/3" },
    { value: 0.4, label: "2/5" },
    { value: 0.75, label: "3/4" },
    { value: 0.6, label: "3/5" },
    { value: 0.8, label: "4/5" }
  ];

  // === Login Modal Functions ===
  function initLoginModal() {
    // Check if modal already exists
    if (document.getElementById('authOverlay')) return;
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'authOverlay';
    overlay.className = 'overlay';
    overlay.style.display = 'none';
    
    // Create modal
    const modal = document.createElement('div');
    modal.id = 'loginModal';
    modal.className = 'login-modal';
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h2>Authentication Required</h2>
          <p>Please enter your credentials to edit examinations</p>
        </div>
        
        <div class="form-group modal">
          <label>Username</label>
          <input type="text" id="usernameInput" class="modal-input" placeholder="Enter your username" autofocus>
        </div>
        
        <div class="form-group modal">
          <label>Password</label>
          <input type="password" id="passwordInput" class="modal-input" placeholder="Enter your password">
        </div>
        
        <div class="error-message" id="loginError"></div>
        
        <button class="btn-modal" id="loginBtn">
          <span>Authenticate</span>
        </button>
      </div>
    `;
    
    // Add to body
    document.body.appendChild(overlay);
    document.body.appendChild(modal);
    
    // Add event listeners
    document.getElementById('loginBtn').addEventListener('click', authenticateUser);
    document.getElementById('passwordInput').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') authenticateUser();
    });
  }
  
  function showLoginModal(examId) {
    pendingExamId = examId;
    document.getElementById('authOverlay').style.display = 'block';
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('loginModal').classList.add('active');
    document.getElementById('usernameInput').value = '';
    document.getElementById('passwordInput').value = '';
    document.getElementById('loginError').style.display = 'none';
    document.getElementById('usernameInput').focus();
  }
  
  function hideLoginModal() {
    document.getElementById('authOverlay').style.display = 'none';
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('loginModal').classList.remove('active');
  }
  
  async function authenticateUser() {
    const username = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value;
    const errorElement = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');
    
    // Clear previous errors
    errorElement.style.display = 'none';
    
    // Validate inputs
    if (!username) {
      showError(errorElement, 'Username is required');
      document.getElementById('usernameInput').focus();
      return;
    }
    
    if (!password) {
      showError(errorElement, 'Password is required');
      document.getElementById('passwordInput').focus();
      return;
    }
    
    // Disable button and show loading state
    loginBtn.disabled = true;
    loginBtn.innerHTML = '<span class="loading-spinner"></span> Verifying credentials...';
    
    try {
      console.log("🔍 Checking credentials at /z_examiny/70z");
      
      const userDocRef = doc(db, "z_examiny", "70z");
      const userDoc = await getDoc(userDocRef);
      
      console.log("📄 Document exists:", userDoc.exists());
      
      if (!userDoc.exists()) {
        throw new Error('Authentication data not found in database');
      }
      
      const userData = userDoc.data();
      console.log("📊 Retrieved user ", userData);
      
      // Verify credentials - case-insensitive for username, exact match for password
      if (!userData.username || !userData.password) {
        throw new Error('Invalid database structure - missing username or password fields');
      }
      
      if (username.toLowerCase() === userData.username.toLowerCase() && 
          password === userData.password) {
        
        console.log("✅ Authentication successful!");
        isAuthenticated = true;
        hideLoginModal();
        
        // Now load the exam
        if (pendingExamId) {
          loadExam(pendingExamId);
        }
      } else {
        console.log("❌ Credentials mismatch");
        console.log("Input username:", username, "DB username:", userData.username);
        console.log("Input password:", password.replace(/./g, '*'), "DB password:", userData.password.replace(/./g, '*'));
        throw new Error('Invalid username or password. Please try again.');
      }
    } catch (error) {
      console.error("❌ Authentication failed:", error);
      
      // Handle specific Firestore errors
      let errorMessage = error.message;
      if (error.code === 'unavailable') {
        errorMessage = "Database is offline. Please check your internet connection.";
      } else if (error.code === 'permission-denied') {
        errorMessage = "Access denied. Please check Firestore security rules.";
      }
      
      showError(errorElement, errorMessage || 'Authentication failed. Please try again.');
      
      // Reset button state
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<span>Authenticate</span>';
    }
  }
  
  function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
  }

  // === Enhanced Navigation Functions ===
  function navigateToQuestion(direction) {
    // Don't navigate if already saving
    if (isSaving) return;
    
    // Clear any pending debounce timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
      saveTimeout = null;
    }
    
    const currentIndex = currentQuestionIndex;
    const newIndex = currentIndex + direction;
    
    // Validate new index
    if (newIndex < 0 || newIndex >= totalQuestions) return;
    
    // Get current question card
    const currentCard = document.querySelector(`.question-card[data-index="${currentIndex + 1}"]`);
    if (!currentCard) return;
    
    // Update save status
    if (saveStatus) {
      saveStatus.textContent = "Saving before navigation...";
      saveStatus.className = "save-status saving";
    }
    
    // Disable navigation buttons while saving
    if (prevQuestionBtn) prevQuestionBtn.disabled = true;
    if (nextQuestionBtn) nextQuestionBtn.disabled = true;
    
    // Save current question immediately
    saveQuestion(currentIndex, currentCard)
      .then(() => {
        // After save completes, show the new question
        showQuestion(newIndex);
        
        // Update save status
        if (saveStatus) {
          saveStatus.textContent = "Navigation completed successfully";
          saveStatus.className = "save-status success";
          
          setTimeout(() => {
            saveStatus.textContent = "All changes saved";
            saveStatus.className = "save-status";
          }, 1500);
        }
      })
      .catch(error => {
        console.error("Failed to save before navigation:", error);
        
        // Show error status
        if (saveStatus) {
          saveStatus.textContent = "Error saving. Please try again.";
          saveStatus.className = "save-status error";
          
          setTimeout(() => {
            saveStatus.textContent = "All changes saved";
            saveStatus.className = "save-status";
          }, 3000);
        }
      })
      .finally(() => {
        // Re-enable navigation buttons
        updateQuestionCounter();
      });
  }

  // === Update Question Counter ===
  function updateQuestionCounter() {
    if (questionCounter) {
      questionCounter.textContent = currentQuestionIndex + 1;
    }
    if (totalQuestionsElement) {
      totalQuestionsElement.textContent = totalQuestions;
    }
    
    // Update navigation button states based on saving status
    if (prevQuestionBtn) prevQuestionBtn.disabled = currentQuestionIndex === 0 || isSaving;
    if (nextQuestionBtn) nextQuestionBtn.disabled = currentQuestionIndex === totalQuestions - 1 || isSaving;
  }

  // === Load Exams ===
  async function loadExams() {
    if (!db) {
      console.error("❌ Firestore not initialized");
      examSelect.innerHTML = '<option value="">Database offline</option>';
      return;
    }
    
    if (!examSelect) {
      console.error("❌ examSelect element not found");
      return;
    }
    
    examSelect.innerHTML = '<option value="">Loading examinations...</option>';
    
    try {
      const querySnapshot = await getDocs(collection(db, "exams"));
      
      if (querySnapshot.empty) {
        examSelect.innerHTML = '<option value="">No examinations found</option>';
        return;
      }
      
      examSelect.innerHTML = '<option value="">Select an examination</option>';
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        const option = document.createElement("option");
        option.value = doc.id;
        option.textContent = `${data.name} (${data.totalQuestions || 1} questions)`;
        examSelect.appendChild(option);
      });
      
    } catch (error) {
      console.error("❌ Failed to load examinations:", error);
      
      // Handle specific Firestore errors
      if (error.code === 'unavailable') {
        examSelect.innerHTML = '<option value="">Database offline. Check internet connection.</option>';
      } else if (error.code === 'permission-denied') {
        examSelect.innerHTML = '<option value="">Access denied. Check security rules.</option>';
      } else {
        examSelect.innerHTML = '<option value="">Failed to load examinations</option>';
      }
    }
  }

  // === Load Exam ===
  async function loadExam(examId) {
    if (!examId) {
      resetForm();
      return;
    }
    
    // If not authenticated, show login modal
    if (!isAuthenticated) {
      showLoginModal(examId);
      return;
    }
    
    if (!db) {
      console.error("❌ Firestore not initialized");
      alert("Database connection lost. Please refresh the page.");
      return;
    }
    
    try {
      const docRef = doc(db, "exams", examId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        alert("Examination not found");
        return;
      }
      
      const data = docSnap.data();
      currentExamId = examId;
      totalQuestions = data.totalQuestions || 1;
      currentSubject = data.subject || "";
      currentTopic = data.topic || "";
      currentQuestionIndex = 0;
      
      // Display exam info
      if (examInfo) {
        examInfo.style.display = "block";
        examInfo.querySelector("h3").textContent = data.name;
        examInfo.querySelector("p:nth-of-type(1) strong").textContent = data.branch;
        examInfo.querySelector("p:nth-of-type(2) strong").textContent = data.level;
        examInfo.querySelector("p:nth-of-type(3) strong").textContent = data.totalQuestions || 1;
        examInfo.querySelector("p:nth-of-type(4) strong").textContent = `+${data.positiveMarks || 1}/-${data.negativeMarks || 0}`;
      }
      
      // Update question counter
      updateQuestionCounter();
      
      // Load questions
      renderQuestions(data);
      
      // Show first question
      showQuestion(0);
      
    } catch (error) {
      console.error("❌ Failed to load examination:", error);
      
      // Handle specific Firestore errors
      if (error.code === 'unavailable') {
        alert("Database is offline. Please check your internet connection.");
      } else if (error.code === 'permission-denied') {
        alert("Access denied. Please check Firestore security rules.");
      } else {
        alert("Load failed: " + error.message);
      }
    }
  }

  // === Show Question ===
  function showQuestion(index) {
    if (index < 0 || index >= totalQuestions) return;
    
    currentQuestionIndex = index;
    
    // Hide all questions
    document.querySelectorAll('.question-card').forEach(card => {
      card.style.display = 'none';
    });
    
    // Show current question
    const currentCard = document.querySelector(`.question-card[data-index="${index + 1}"]`);
    if (currentCard) {
      currentCard.style.display = 'flex';
    }
    
    // Update question counter
    updateQuestionCounter();
  }

  // === Render Questions ===
  function renderQuestions(data) {
    if (!questionsContainer) return;
    
    questionsContainer.innerHTML = '';
    
    for (let i = 1; i <= totalQuestions; i++) {
      const q = data.questions?.[`q${i}`] || {
        question: `Question ${i}`,
        type: "mcq",
        options: { A: '', B: '', C: '', D: '' },
        correct: null
      };
      
      renderQuestionCard(i, q);
    }
  }

  // === Render Question Card ===
  function renderQuestionCard(index, data) {
    const type = questionTypes[data.type] || questionTypes["mcq"];
    const card = document.createElement("div");
    card.className = "question-card";
    card.dataset.index = index;
    card.dataset.type = data.type;
    
    card.innerHTML = `
      <div class="question-header">
        <strong>Question ${index}</strong>
        <div class="type-selector">
          <label>Question Type</label>
          <select class="question-type">
            <option value="mcq" ${data.type === "mcq" ? "selected" : ""}>MCQ</option>
            <option value="msq" ${data.type === "msq" ? "selected" : ""}>MSQ</option>
            <option value="nat" ${data.type === "nat" ? "selected" : ""}>NAT</option>
          </select>
        </div>
      </div>
      
      <div class="question-meta">
        <div class="meta-group full-width">
          <label>Question</label>
          <div class="question-text" contenteditable="true" placeholder="Enter your question here...">${data.question || ''}</div>
        </div>
        
        <div class="meta-group full-width">
          <label>Explanation</label>
          <div class="explanation-text" contenteditable="true" placeholder="Explanation for correct answer...">${data.explanation || ''}</div>
        </div>
        
        <div class="meta-group full-width">
          <div class="hint-toggle">
            <label>
              <input type="checkbox" class="hint-toggle-checkbox" ${data.hint ? 'checked' : ''}>
              <span>Show Hint</span>
            </label>
          </div>
          <div class="hint-section" ${data.hint ? '' : 'style="display: none;"'}>
            <label>Hint</label>
            <div class="hint-text" contenteditable="true" placeholder="Hint for students...">${data.hint || ''}</div>
          </div>
        </div>
        
        <div class="meta-group half-width">
          <label>Subject</label>
          <input type="text" class="subject" placeholder="Subject" value="${data.subject || currentSubject}">
        </div>
        
        <div class="meta-group half-width">
          <label>Topic</label>
          <input type="text" class="topic" placeholder="Topic" value="${data.topic || currentTopic}">
        </div>
        
        <div class="marking-group full-width">
          <div class="marking-item">
            <label>Positive Marking</label>
            <div class="marking-buttons positive-marking">
              ${positiveMarkingOptions.map(value => `
                <button type="button" class="marking-btn ${value === (data.positiveMarking || 1) ? 'active' : ''}" 
                        data-value="${value}">${value}</button>
              `).join('')}
            </div>
          </div>
          
          <div class="marking-item">
            <label>Negative Marking</label>
            <div class="marking-buttons negative-marking">
              ${negativeMarkingOptions.map(option => `
                <button type="button" class="marking-btn ${Math.abs((data.negativeMarking || 0) - option.value) < 0.01 ? 'active' : ''}" 
                        data-value="${option.value}">${option.label}</button>
              `).join('')}
              <button type="button" class="marking-btn ${data.negativeMarking === 0 ? 'active' : ''}" 
                      data-value="0">None</button>
            </div>
          </div>
        </div>
        
        <div class="meta-group half-width">
          <label>Difficulty</label>
          <select class="difficulty-level">
            <option value="easy" ${data.difficulty === "easy" ? "selected" : ""}>Easy</option>
            <option value="medium" ${data.difficulty === "medium" || !data.difficulty ? "selected" : ""}>Medium</option>
            <option value="hard" ${data.difficulty === "hard" ? "selected" : ""}>Hard</option>
          </select>
        </div>
      </div>
      
      <div class="question-body">
        <div class="options-container">
          ${type.createUI(data)}
        </div>
      </div>
    `;
    
    // Set up event listeners
    setupQuestionCardEvents(card, index);
    
    questionsContainer.appendChild(card);
  }

  // === Setup Question Card Events ===
  function setupQuestionCardEvents(card, index) {
    const questionText = card.querySelector('.question-text');
    const explanationText = card.querySelector('.explanation-text');
    const hintToggle = card.querySelector('.hint-toggle-checkbox');
    const hintSection = card.querySelector('.hint-section');
    const hintText = card.querySelector('.hint-text');
    const subjectInput = card.querySelector('.subject');
    const topicInput = card.querySelector('.topic');
    const positiveMarking = card.querySelector('.positive-marking');
    const negativeMarking = card.querySelector('.negative-marking');
    const difficultyLevel = card.querySelector('.difficulty-level');
    const typeSelect = card.querySelector('.question-type');
    
    // Input change handlers with debounce
    const inputs = [
      questionText,
      explanationText,
      hintText,
      subjectInput,
      topicInput,
      difficultyLevel
    ];
    
    inputs.forEach(input => {
      if (input) {
        input.addEventListener('input', () => {
          debounceSave(index, card);
        });
      }
    });
    
    // Hint toggle
    if (hintToggle) {
      hintToggle.addEventListener('change', () => {
        if (hintToggle.checked) {
          hintSection.style.display = 'block';
        } else {
          hintSection.style.display = 'none';
        }
        debounceSave(index, card);
      });
    }
    
    // Marking button click handlers
    positiveMarking?.querySelectorAll('.marking-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        positiveMarking.querySelectorAll('.marking-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        debounceSave(index, card);
      });
    });
    
    negativeMarking?.querySelectorAll('.marking-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        negativeMarking.querySelectorAll('.marking-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        debounceSave(index, card);
      });
    });
    
    // Type selector change handler
    if (typeSelect) {
      typeSelect.addEventListener('change', () => {
        const newType = typeSelect.value;
        const currentType = card.dataset.type;
        
        if (newType !== currentType) {
          // Update card data type
          card.dataset.type = newType;
          
          // Get clean data structure for this type
          const cleanData = questionTypes[newType].getCleanData({
            question: questionText.textContent,
            explanation: explanationText.textContent,
            subject: subjectInput.value,
            topic: topicInput.value,
            positiveMarking: parseFloat(positiveMarking.querySelector('.active')?.dataset.value) || 1,
            negativeMarking: parseFloat(negativeMarking.querySelector('.active')?.dataset.value) || 0,
            difficulty: difficultyLevel.value
          });
          
          // Re-render the options container
          const optionsContainer = card.querySelector('.options-container');
          optionsContainer.innerHTML = questionTypes[newType].createUI(cleanData);
          
          // Setup events for the new UI
          setupOptionEvents(card, newType);
          
          // Save the change
          debounceSave(index, card);
        }
      });
    }
    
    // Setup option events
    setupOptionEvents(card, card.dataset.type);
    
    // Make contenteditable areas dynamic
    makeContentEditableDynamic(card);
  }

  // === Make Content Editable Dynamic ===
  function makeContentEditableDynamic(card) {
    const editableElements = card.querySelectorAll('[contenteditable="true"]');
    
    editableElements.forEach(element => {
      // Initial resize
      resizeContentEditable(element);
      
      // Listen for input and resize
      element.addEventListener('input', () => {
        resizeContentEditable(element);
        debounceSave(parseInt(card.dataset.index), card);
      });
      
      // Listen for paste and resize
      element.addEventListener('paste', () => {
        setTimeout(() => {
          resizeContentEditable(element);
        }, 1);
      });
    });
  }

  // === Resize Content Editable ===
  function resizeContentEditable(element) {
    // Reset height to auto to get correct scrollHeight
    element.style.height = 'auto';
    
    // Set height to scrollHeight
    element.style.height = `${element.scrollHeight}px`;
    
    // Ensure minimum height
    if (element.scrollHeight < 60) {
      element.style.height = '60px';
    }
  }

  // === Setup Option Events ===
  function setupOptionEvents(card, type) {
    const optionsContainer = card.querySelector('.options-container');
    
    if (type === "mcq" || type === "msq") {
      const optionTexts = optionsContainer.querySelectorAll('.option-text');
      
      optionTexts.forEach(text => {
        text.addEventListener('input', () => {
          const optionKey = text.closest('.option-label')?.querySelector('.option-letter')?.textContent || 
                           text.closest('.option-group')?.querySelector('.option-letter')?.textContent;
          const options = {};
          
          // Collect all option values
          optionsContainer.querySelectorAll('.option-text').forEach(opt => {
            const key = opt.closest('.option-label')?.querySelector('.option-letter')?.textContent || 
                       opt.closest('.option-group')?.querySelector('.option-letter')?.textContent;
            if (key) options[key] = opt.textContent;
          });
          
          // Save the updated options
          debounceSave(parseInt(card.dataset.index), card, {
            options: options
          });
        });
      });
      
      // Handle radio/checkbox changes
      const optionInputs = optionsContainer.querySelectorAll('input[type="radio"], input[type="checkbox"]');
      
      optionInputs.forEach(input => {
        input.addEventListener('change', () => {
          let correctAnswer;
          
          if (type === "mcq") {
            const selected = optionsContainer.querySelector('input[type="radio"]:checked');
            correctAnswer = selected ? selected.value : null;
          } else {
            const selected = optionsContainer.querySelectorAll('input[type="checkbox"]:checked');
            correctAnswer = Array.from(selected).map(el => el.value);
          }
          
          // Save the updated correct answer
          debounceSave(parseInt(card.dataset.index), card, {
            correct: correctAnswer
          });
        });
      });
    } else if (type === "nat") {
      const natAnswer = optionsContainer.querySelector('.nat-answer');
      const hintText = optionsContainer.querySelector('.hint-text');
      
      if (natAnswer) {
        natAnswer.addEventListener('input', () => {
          debounceSave(parseInt(card.dataset.index), card, {
            correct: natAnswer.value
          });
        });
      }
      
      if (hintText) {
        hintText.addEventListener('input', () => {
          debounceSave(parseInt(card.dataset.index), card, {
            hint: hintText.textContent
          });
        });
      }
    }
  }

  // === Debounce Save Function ===
  function debounceSave(index, card, additionalData = {}) {
    // Don't allow saving if not authenticated
    if (!isAuthenticated) {
      showLoginModal(currentExamId);
      return;
    }
    
    // Clear any existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    // Show saving status
    if (saveStatus) {
      saveStatus.textContent = "Saving...";
      saveStatus.className = "save-status saving";
    }
    
    // Set a new timeout
    saveTimeout = setTimeout(async () => {
      await saveQuestion(index, card, additionalData);
    }, 800); // 800ms debounce delay
  }

  // === Save Question ===
  async function saveQuestion(index, card, additionalData = {}) {
    // Don't allow saving if not authenticated
    if (!isAuthenticated) {
      showLoginModal(currentExamId);
      return;
    }
    
    if (!currentExamId) return;
    
    try {
      // Show saving status
      isSaving = true;
      if (saveStatus) {
        saveStatus.textContent = "Saving...";
        saveStatus.className = "save-status saving";
      }
      
      const type = card.dataset.type;
      const typeDef = questionTypes[type];
      
      // Get clean data structure for this type
      const cleanData = typeDef.getCleanData({
        question: card.querySelector('.question-text').textContent,
        explanation: card.querySelector('.explanation-text').textContent,
        subject: card.querySelector('.subject').value,
        topic: card.querySelector('.topic').value,
        positiveMarking: parseFloat(card.querySelector('.positive-marking .active')?.dataset.value) || 1,
        negativeMarking: parseFloat(card.querySelector('.negative-marking .active')?.dataset.value) || 0,
        difficulty: card.querySelector('.difficulty-level').value
      });
      
      // Apply any additional data
      if (Object.keys(additionalData).length > 0) {
        Object.assign(cleanData, additionalData);
      }
      
      // Extract data based on question type
      switch (type) {
        case "mcq":
        case "msq":
          // Handle options
          const options = {};
          card.querySelectorAll('.option-text').forEach(opt => {
            const key = opt.closest('.option-label')?.querySelector('.option-letter')?.textContent || 
                       opt.closest('.option-group')?.querySelector('.option-letter')?.textContent;
            if (key) options[key] = opt.textContent;
          });
          
          // Handle correct answer
          if (type === "mcq") {
            const selected = card.querySelector('input[type="radio"]:checked');
            cleanData.correct = selected ? selected.value : null;
          } else if (type === "msq") {
            const selected = card.querySelectorAll('input[type="checkbox"]:checked');
            cleanData.correct = Array.from(selected).map(el => el.value);
          }
          
          cleanData.options = options;
          break;
          
        case "nat":
          cleanData.correct = card.querySelector('.nat-answer')?.value || '';
          cleanData.hint = card.querySelector('.hint-text')?.textContent || '';
          break;
      }
      
      // Save to Firebase
      const updateObject = {};
      updateObject[`questions.q${index}`] = cleanData;
      
      await updateDoc(doc(db, "exams", currentExamId), updateObject);
      
      // Update save status
      if (saveStatus) {
        saveStatus.textContent = "Changes saved successfully";
        saveStatus.className = "save-status success";
        
        // Reset status after 2 seconds
        setTimeout(() => {
          saveStatus.textContent = "All changes saved";
          saveStatus.className = "save-status";
        }, 2000);
      }
      
    } catch (error) {
      console.error("Failed to save question:", error);
      
      // Show error status
      if (saveStatus) {
        saveStatus.textContent = "Error saving. Please try again.";
        saveStatus.className = "save-status error";
        
        // Reset status after 3 seconds
        setTimeout(() => {
          saveStatus.textContent = "All changes saved";
          saveStatus.className = "save-status";
        }, 3000);
      }
    } finally {
      isSaving = false;
      // Update button states after saving completes
      updateQuestionCounter();
    }
  }

  // === Add Question ===
  async function addQuestion() {
    // Don't allow adding questions if not authenticated
    if (!isAuthenticated && currentExamId) {
      showLoginModal(currentExamId);
      return;
    }
    
    if (!currentExamId) {
      alert("Please select an examination first");
      return;
    }
    
    try {
      totalQuestions++;
      
      const updateObject = {};
      updateObject[`questions.q${totalQuestions}`] = {
        question: `Question ${totalQuestions}`,
        type: "mcq",
        options: { A: '', B: '', C: '', D: '' },
        correct: null,
        subject: currentSubject,
        topic: currentTopic,
        positiveMarking: 1,
        negativeMarking: 0,
        difficulty: 'medium',
        updatedAt: new Date().toISOString()
      };
      updateObject[`totalQuestions`] = totalQuestions;
      
      await updateDoc(doc(db, "exams", currentExamId), updateObject);
      
      // Re-render questions
      const docRef = doc(db, "exams", currentExamId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        renderQuestions(data);
      }
      
      // Show new question
      setTimeout(() => {
        showQuestion(totalQuestions - 1);
      }, 300);
      
    } catch (error) {
      console.error("Failed to add question:", error);
      alert("Failed to add question. Please try again.");
    }
  }

  // === Reset Form ===
  function resetForm() {
    if (questionsContainer) {
      questionsContainer.innerHTML = '';
    }
    
    if (examInfo) {
      examInfo.style.display = 'none';
    }
    
    currentExamId = null;
    totalQuestions = 0;
    currentQuestionIndex = 0;
    currentSubject = "";
    currentTopic = "";
    isAuthenticated = false;
    
    // Update question counter
    updateQuestionCounter();
  }

  // === Initialize Navigation Controls ===
  function initNavigationControls() {
    // Check if navigation elements already exist
    let questionNavigation = document.querySelector('.question-navigation');
    
    // If navigation doesn't exist, create it
    if (!questionNavigation) {
      // Create the navigation container
      questionNavigation = document.createElement('div');
      questionNavigation.className = 'question-navigation';
      
      // Create the content for navigation
      questionNavigation.innerHTML = `
        <div class="question-counter">
          Question <span id="questionCounter">1</span> of <span id="totalQuestions">1</span>
        </div>
        <div class="question-navigation-controls">
          <button id="prevQuestionBtn" class="nav-button prev" data-tooltip="Previous Question">
            <span>←</span>
          </button>
          <button id="nextQuestionBtn" class="nav-button next" data-tooltip="Next Question">
            <span>→</span>
          </button>
        </div>
      `;
      
      // Insert the navigation before the questions container
      if (questionsContainer && questionsContainer.parentNode) {
        questionsContainer.parentNode.insertBefore(questionNavigation, questionsContainer);
      }
    }
    
    // Create save status element if it doesn't exist
    let saveStatus = document.getElementById('saveStatus');
    if (!saveStatus) {
      saveStatus = document.createElement('div');
      saveStatus.id = 'saveStatus';
      saveStatus.className = 'save-status';
      document.body.appendChild(saveStatus);
    }
    
    // Return the DOM elements
    return {
      prevQuestionBtn: document.getElementById('prevQuestionBtn'),
      nextQuestionBtn: document.getElementById('nextQuestionBtn'),
      questionCounter: document.getElementById('questionCounter'),
      totalQuestionsElement: document.getElementById('totalQuestions'),
      saveStatus: saveStatus
    };
  }

  // === Event Listeners ===
  examSelect?.addEventListener('change', (e) => {
    if (e.target.value) {
      showLoginModal(e.target.value);
    } else {
      resetForm();
    }
  });

  addQuestionBtn?.addEventListener('click', addQuestion);
  
  // Add keyboard navigation for better UX
  document.addEventListener('keydown', (e) => {
    // Left arrow key for previous question
    if (e.key === 'ArrowLeft' && currentQuestionIndex > 0) {
      e.preventDefault();
      navigateToQuestion(-1);
    }
    // Right arrow key for next question
    else if (e.key === 'ArrowRight' && currentQuestionIndex < totalQuestions - 1) {
      e.preventDefault();
      navigateToQuestion(1);
    }
  });
  
  // Add button click listeners for navigation
  if (prevQuestionBtn) {
    prevQuestionBtn.addEventListener('click', () => {
      navigateToQuestion(-1);
    });
  }
  
  if (nextQuestionBtn) {
    nextQuestionBtn.addEventListener('click', () => {
      navigateToQuestion(1);
    });
  }

  // === Load on Page Load ===
  loadExams();
});