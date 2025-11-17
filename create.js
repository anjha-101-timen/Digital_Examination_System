// Import Firebase modules (v12.1.0)
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, addDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// Web app's Firebase configuration
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
let app, db;

try {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log("Firebase initialized successfully");
} catch (error) {
  console.error("Firebase initialization failed:", error);
  alert("Application failed to connect to the backend service. Please try again later.");
}

// Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {
  const examForm = document.getElementById("examForm");

  if (!examForm) {
    console.error("Form element not found in DOM");
    return;
  }

  // === Generate Hours Table (1–5) ===
  const hoursRow = document.querySelector('#hoursTable tr');
  for (let h = 1; h <= 5; h++) {
    const td = document.createElement("td");
    td.textContent = `${h}h`;
    td.dataset.value = h;
    td.addEventListener('click', function () {
      document.querySelectorAll('#hoursTable td').forEach(t => t.classList.remove('selected'));
      this.classList.add('selected');
    });
    hoursRow.appendChild(td);
  }

  // === Generate Minutes Grid (0–59) ===
  const minutesGrid = document.getElementById("minutesGrid");
  for (let m = 0; m < 60; m++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "grid-btn";
    btn.textContent = m;
    btn.dataset.value = m;
    minutesGrid.appendChild(btn);
  }

  // === Generate Questions Grid (1–250) ===
  const questionsGrid = document.getElementById("questionsGrid");
  for (let q = 1; q <= 250; q++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "grid-btn";
    btn.textContent = q;
    btn.dataset.value = q;
    questionsGrid.appendChild(btn);
  }

  // === Generate Time Min Table (1–10) ===
  const timeMinRow = document.querySelector('#timeMinTable tr');
  for (let m = 1; m <= 10; m++) {
    const td = document.createElement("td");
    td.textContent = `${m}m`;
    td.dataset.value = m;
    td.addEventListener('click', function () {
      document.querySelectorAll('#timeMinTable td').forEach(t => t.classList.remove('selected'));
      this.classList.add('selected');
    });
    timeMinRow.appendChild(td);
  }

  // === Generate Seconds Grid (0–59) ===
  const secondsGrid = document.getElementById("secondsGrid");
  for (let s = 0; s < 60; s++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "grid-btn";
    btn.textContent = s;
    btn.dataset.value = s;
    secondsGrid.appendChild(btn);
  }

  // === Generate A-Z Buttons ===
  const lettersGrid = document.getElementById("lettersGrid");
  for (let i = 0; i < 26; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "grid-btn";
    btn.textContent = String.fromCharCode(65 + i);
    lettersGrid.appendChild(btn);
  }

  // === Generate 1-99 Buttons ===
  const numbersGrid = document.getElementById("numbersGrid");
  for (let i = 1; i <= 99; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "grid-btn";
    btn.textContent = i;
    numbersGrid.appendChild(btn);
  }

  // === Handle Tabs (Section: A-Z / 1-99) ===
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', function () {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.section-grid').forEach(g => g.style.display = 'none');
      
      this.classList.add('active');
      const tabId = this.dataset.tab;
      document.getElementById(tabId + 'Grid').style.display = 'grid';
    });
  });

  // Trigger initial tab
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) activeTab.click();

  // === Generic Selection Handler ===
  function addClickListeners(selector, isSingleSelect = false, containerId = null) {
    const container = containerId ? document.getElementById(containerId) : document;
    if (!container) return;

    const elements = container.querySelectorAll(selector);
    elements.forEach(btn => {
      btn.addEventListener('click', function () {
        if (isSingleSelect) {
          elements.forEach(el => el.classList.remove('selected'));
          this.classList.add('selected');
        } else {
          this.classList.toggle('selected');
        }
      });
    });
  }

  // Add listeners to interactive components
  addClickListeners('.class-grid .grid-btn', false, 'classGrid');
  addClickListeners('.semester-grid .grid-btn', false, 'semesterGrid');
  addClickListeners('#lettersGrid .grid-btn', false, 'lettersGrid');
  addClickListeners('#numbersGrid .grid-btn', false, 'numbersGrid');
  addClickListeners('.min-grid .grid-btn', true, 'minutesGrid');
  addClickListeners('.sec-grid .grid-btn', true, 'secondsGrid');
  addClickListeners('.q-grid .grid-btn', true, 'questionsGrid');

  // Single-select: MCQ Option Count
  addClickListeners('.chip[data-group="mcq-options"]', true);

  // Multi-select: Question and Answer Types
  addClickListeners('#questionTypeGroup .chip', false);
  addClickListeners('#answerTypeGroup .chip', false);

  // === Get Selected Values from UI ===
  function getSelectedValues(containerId) {
    const container = document.getElementById(containerId);
    return Array.from(container?.querySelectorAll('.grid-btn.selected') || [])
      .map(btn => btn.textContent);
  }

  function getSelectedChips(containerId) {
    const container = document.getElementById(containerId);
    return Array.from(container?.querySelectorAll('.chip.selected') || [])
      .map(chip => chip.dataset.value);
  }

  // === Form Submission Handler ===
  examForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Verify Firestore is available
    if (!db) {
      alert("System is currently offline. Unable to process request.");
      return;
    }

    // Retrieve selected values
    const hourCell = document.querySelector('#hoursTable td.selected');
    const minBtn = document.querySelector('.min-grid .grid-btn.selected');
    const qBtn = document.querySelector('.q-grid .grid-btn.selected');
    const timeMinCell = document.querySelector('#timeMinTable td.selected');
    const secBtn = document.querySelector('.sec-grid .grid-btn.selected');

    const classes = getSelectedValues('classGrid');
    const semesters = getSelectedValues('semesterGrid');
    const sectionsLetters = document.getElementById('lettersGrid').style.display !== 'none'
      ? getSelectedValues('lettersGrid') : [];
    const sectionsNumbers = document.getElementById('numbersGrid').style.display !== 'none'
      ? getSelectedValues('numbersGrid') : [];
    const sections = [...sectionsLetters, ...sectionsNumbers];

    const questionTypes = getSelectedChips('questionTypeGroup');
    const answerTypes = getSelectedChips('answerTypeGroup');
    const mcqOptions = document.querySelector('.chip[data-group="mcq-options"].selected')?.dataset.value || null;

    // Validation
    if (!hourCell || !minBtn) {
      alert("Please select exam duration: hours and minutes.");
      return;
    }
    if (!qBtn) {
      alert("Please select the total number of questions.");
      return;
    }
    if (!timeMinCell || !secBtn) {
      alert("Please specify time allocated per question.");
      return;
    }
    if (!mcqOptions) {
      alert("Please select the number of multiple-choice options per question.");
      return;
    }
    if (classes.length === 0) {
      alert("Please assign applicable classes for this examination.");
      return;
    }
    if (semesters.length === 0) {
      alert("Please specify academic semesters for this exam.");
      return;
    }
    if (sections.length === 0) {
      alert("Please assign one or more sections to this exam.");
      return;
    }
    if (questionTypes.length === 0) {
      alert("Please define the types of objective questions included in the exam.");
      return;
    }

    // Construct exam data object
    const data = {
      name: document.getElementById("examName").value.trim(),
      branch: document.getElementById("examBranch").value.trim(),
      code: document.getElementById("examCode").value.trim(),
      subject: document.getElementById("examSubject").value.trim(),
      topic: document.getElementById("examTopic").value.trim(),
      duration: parseInt(hourCell.dataset.value) * 60 + parseInt(minBtn.dataset.value),
      level: document.getElementById("examLevel").value,
      totalQuestions: parseInt(qBtn.dataset.value),
      timePerQuestion: parseInt(timeMinCell.dataset.value) * 60 + parseInt(secBtn.dataset.value),
      positiveMarks: parseFloat(document.getElementById("positiveMarks").value),
      negativeMarks: parseFloat(document.getElementById("negativeMarks").value),
      examDate: document.getElementById("examDate").value,
      examTime: document.getElementById("examTime").value,
      description: document.getElementById("examDescription").value.trim(),
      mcqOptions: parseInt(mcqOptions),
      classes,
      semesters,
      sections,
      questionTypes,
      answerTypes,
      createdAt: new Date().toISOString()
    };

    // Validate required fields
    const requiredFields = ['name', 'branch', 'code', 'subject'];
    for (const field of requiredFields) {
      if (!data[field]) {
        const label = field.replace(/([A-Z])/g, ' $1').toLowerCase();
        alert(`Please enter ${label}.`);
        return;
      }
    }

    try {
      await addDoc(collection(db, "exams"), data);
      alert("Exam configuration saved successfully.");
      examForm.reset();
      document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));
      document.getElementById("examLevel").value = "";
      // Reset section tab
      document.getElementById("lettersGrid").style.display = "grid";
      document.getElementById("numbersGrid").style.display = "none";
      document.querySelector('.tab[data-tab="letters"]').classList.add('active');
    } catch (error) {
      console.error("Failed to save exam data:", error);
      alert("An error occurred while saving the exam. Please try again.");
    }
  });
});