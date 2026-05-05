// 1. FIREBASE IMPORTS
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import {
   getFirestore,
   collection,
   addDoc,
   onSnapshot,
   query,
   orderBy,
   serverTimestamp,
   updateDoc,
   doc,
   where
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";


// 2. YOUR CONFIGURATION
const firebaseConfig = {
   apiKey: "AIzaSyCQGcvANo3uxcwIXp9sBAhcz3mCaTmTqH8",
   authDomain: "pup-schoolsafetysystem.firebaseapp.com",
   projectId: "pup-schoolsafetysystem",
   symbolicId: "pup-schoolsafetysystem",
   projectId: "pup-schoolsafetysystem",
   storageBucket: "pup-schoolsafetysystem.firebasestorage.app",
   messagingSenderId: "150771374457",
   appId: "1:150771374457:web:3e238dfb6ac75798f177a8",
   measurementId: "G-JJHFMRS80K"
};


// 3. INITIALIZE FIREBASE
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


document.addEventListener('DOMContentLoaded', () => {
   // UI Selectors
   const navLinks = document.querySelectorAll('.sidebar nav a');
   const sections = document.querySelectorAll('.section');
   const campusMap = document.getElementById('campusMap');
   const notifHub = document.getElementById('notif-hub');
   const issueSelect = document.getElementById('issue-type');
   const anonCheckbox = document.getElementById('anon-check');


   // --- LIVE COUNTERS (PENDING & RESOLVED) ---
  
   // Listen for Pending/Urgent
   const pendingQuery = query(collection(db, "reports"), where("status", "in", ["pending", "URGENT"]));
   onSnapshot(pendingQuery, (snapshot) => {
       const countElement = document.getElementById('pending-count');
       if (countElement) countElement.textContent = snapshot.size;
   });


   // Listen for Resolved (Real-Time)
   const resolvedQuery = query(collection(db, "reports"), where("status", "==", "resolved"));
   onSnapshot(resolvedQuery, (snapshot) => {
       const resolvedCountElement = document.getElementById('resolved-count');
       if (resolvedCountElement) resolvedCountElement.textContent = snapshot.size;
   });


   // --- A. NAVIGATION LOGIC ---
   function showSection(id) {
       sections.forEach(s => s.style.display = 'none');
       const target = document.getElementById(id.replace('#', ''));
       if (target) target.style.display = 'block';
      
       navLinks.forEach(link => {
           link.classList.toggle('active', link.getAttribute('href') === id);
       });
   }


   navLinks.forEach(link => {
       link.addEventListener('click', (e) => {
           e.preventDefault();
           showSection(link.getAttribute('href'));
       });
   });


   showSection('#dashboard');


   // --- B. REAL-TIME MAP LOGIC ---
   onSnapshot(collection(db, "hazards"), (snapshot) => {
       snapshot.docChanges().forEach((change) => {
           if (change.type === "added") {
               const data = change.doc.data();
               const pin = document.createElement('div');
               pin.className = 'marker m-hazard';
               pin.style.left = data.x + '%';
               pin.style.top = data.y + '%';
               campusMap.appendChild(pin);
           }
       });
   });


   campusMap.addEventListener('click', async (e) => {
       const rect = campusMap.getBoundingClientRect();
       const x = ((e.clientX - rect.left) / rect.width) * 100;
       const y = ((e.clientY - rect.top) / rect.height) * 100;


       try {
           await addDoc(collection(db, "hazards"), { x, y, timestamp: serverTimestamp() });
           showToast("Hazard location reported.", "danger");
       } catch (err) { console.error(err); }
   });


   // --- C. FORM SUBMISSIONS ---
   const handleFormSubmit = async (e, type) => {
       e.preventDefault();
       const formData = new FormData(e.target);
       const data = Object.fromEntries(formData.entries());


       const urgentKeywords = ["fire", "flood", "earthquake", "injury", "help"];
       const messageText = (data.suggestions || data.experience || "").toLowerCase();
       const isUrgent = urgentKeywords.some(word => messageText.includes(word));


       if (type === "Classroom Feedback" && anonCheckbox?.checked) {
           data['student-name'] = "Anonymous Student";
       }


       try {
           await addDoc(collection(db, "reports"), {
               ...data,
               type: type,
               status: isUrgent ? "URGENT" : "pending",
               timestamp: serverTimestamp()
           });
           showToast(isUrgent ? "🚨 URGENT Sent!" : "Submitted!", isUrgent ? "danger" : "success");
           e.target.reset();
           showSection('#query');
       } catch (err) { console.error(err); }
   };


   document.querySelector('.feedback-form').onsubmit = (e) => handleFormSubmit(e, "Classroom Feedback");
   document.querySelector('.readiness-form').onsubmit = (e) => handleFormSubmit(e, "Disaster Readiness");


   // --- D. REAL-TIME HISTORY & ADMIN PANEL ---
   const q = query(collection(db, "reports"), orderBy("timestamp", "desc"));


   onSnapshot(q, (snapshot) => {
       const queryList = document.getElementById('queryList');
       const adminTable = document.getElementById('admin-table-body');
      
       if (queryList) queryList.innerHTML = "";
       if (adminTable) adminTable.innerHTML = "";


       snapshot.forEach((docSnap) => {
           const data = docSnap.data();
           const id = docSnap.id;
          
           // Handle timestamp formatting
           const timestamp = data.timestamp ? data.timestamp.toDate() : new Date();
           const dateStr = timestamp.toLocaleDateString() + " " + timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          
           // Dynamic Status Colors
           const statusColor = data.status === 'resolved' ? '#10b981' : (data.status === 'URGENT' ? '#ef4444' : '#f59e0b');


           // 1. Update Request History (Student View)
           if (queryList) {
               queryList.insertAdjacentHTML('beforeend', `
                   <div class="req-item" style="border-left-color: ${statusColor}">
                       <div><strong>${data.type}</strong><br><small>${dateStr}</small></div>
                       <span style="color: ${statusColor}; font-weight:bold;">${data.status.toUpperCase()}</span>
                   </div>`);
           }


           // 2. Update Admin Management Table
           if (adminTable) {
               let infoDisplay = "";
              
               if (data.type === "Classroom Feedback") {
                   // Shows Room, Name, and Year/Section
                   infoDisplay = `
                       <strong>Rm: ${data.roomnum || 'N/A'}</strong><br>
                       <small>${data['student-name'] || 'Anonymous'}</small><br>
                       <small>Sec: ${data['yr-section'] || 'N/A'}</small>`;
               } else if (data.type === "Disaster Readiness") {
                   // Shows Address and Emergency Contact Number
                   infoDisplay = `
                       <strong>Loc: ${data.address || 'N/A'}</strong><br>
                       <small>Contact: ${data['emergency-contact'] || 'N/A'}</small>`;
               } else {
                   infoDisplay = "Campus Map Alert";
               }


               adminTable.insertAdjacentHTML('beforeend', `
                   <tr>
                       <td>${dateStr}</td>
                       <td>${data.type}</td>
                       <td>${infoDisplay}</td>
                       <td><span class="status-pill ${data.status}">${data.status.toUpperCase()}</span></td>
                       <td>
                           ${data.status !== 'resolved'
                               ? `<button class="resolve-btn" data-id="${id}">Resolve</button>`
                               : `<span style="color:green; font-weight:bold;">✓ Fixed</span>`}
                       </td>
                   </tr>`);
           }
       });


       // Re-bind click events for Resolve buttons
       document.querySelectorAll('.resolve-btn').forEach(btn => {
           btn.onclick = async () => {
               const docRef = doc(db, "reports", btn.getAttribute('data-id'));
               try {
                   await updateDoc(docRef, { status: "resolved" });
                   showToast("Issue Marked as Resolved!", "success");
               } catch (err) {
                   console.error("Resolve Error:", err);
                   showToast("Update failed.", "danger");
               }
           };
       });
   });


   // --- E. UTILITY FUNCTIONS ---
   function showToast(msg, type) {
       const toast = document.createElement('div');
       toast.className = 'toast';
       toast.style.borderLeftColor = type === 'danger' ? 'red' : '#10b981';
       toast.innerHTML = `<strong>System:</strong> ${msg}`;
       notifHub.appendChild(toast);
       setTimeout(() => toast.remove(), 4000);
   }


   // Global Switcher
   window.quickSwitch = (id) => {
       document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
       const target = document.getElementById(id.replace('#',''));
       if(target) target.style.display = 'block';
   };
});

