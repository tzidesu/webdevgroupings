document.addEventListener('DOMContentLoaded', () => {
// SELECTORS
    const navLinks = document.querySelectorAll('.sidebar nav a');
    const sections = document.querySelectorAll('.section');
    const campusMap = document.getElementById('campusMap');
    const feedbackForm = document.querySelector('.feedback-form');
    const readinessForm = document.querySelector('.readiness-form');
    const queryList = document.getElementById('queryList');
    const notifHub = document.getElementById('notif-hub');

// NAVIGATION LOGIC (Tab Switching)
    function showSection(id) {
        // Hide all sections first
        sections.forEach(section => {
            section.style.display = 'none';
        });

        // Show the targeted section
        const target = document.getElementById(id.replace('#', ''));
        if (target) {
            target.style.display = 'block';
        }
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const href = link.getAttribute('href');
            showSection(href);
            
            // Visual feedback for sidebar
            navLinks.forEach(l => l.style.background = 'transparent');
            link.style.background = 'rgba(255,255,255,0.2)';
        });
    });

    // Initialize the view on Dashboard
    showSection('#dashboard');

// INTERACTIVE MAP PINNING
    if (campusMap) {
        campusMap.onclick = function(e) {
            const rect = this.getBoundingClientRect();
            // Calculate percentage coordinates for responsiveness
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            
            const pin = document.createElement('div');
            // Uses your CSS class m-hazard for the pulsing red effect
            pin.className = 'marker m-hazard'; 
            pin.style.left = x + '%'; 
            pin.style.top = y + '%';
            this.appendChild(pin);
            
            notify("Hazard report pinned to map and logged.", "danger");
            addRequestToHistory("Map Hazard Report", "Campus Map Pin");
        };
    }

// CLASSROOM FEEDBACK SUBMISSION
    if (feedbackForm) {
        feedbackForm.onsubmit = function(e) {
            e.preventDefault();
            const room = document.getElementById('roomnum').value;
            const isAnon = this.querySelector('input[name="anonymous"]').checked;
            
            notify(`Feedback for ${room} submitted ${isAnon ? 'anonymously' : ''}.`, "success");
            addRequestToHistory("Classroom Feedback", room);
            
            this.reset();
            showSection('#query'); // Redirect to track the request
        };
    }

    // DISASTER READINESS SUBMISSION
    if (readinessForm) {
        readinessForm.onsubmit = function(e) {
            e.preventDefault();
            
            // Update UI
            notify("Readiness status and disaster experience updated.", "success");
            addRequestToHistory("Readiness Survey", "Student Profile");
            
            this.reset();
            showSection('#dashboard'); // Return home after big update
        };
    }

// DYNAMIC HISTORY UPDATE (The Query Section)
    function addRequestToHistory(type, location) {
        if (!queryList) return;

        const newItem = document.createElement('div');
        newItem.className = 'req-item';
        // Applying inline styles to ensure visibility with your provided CSS
        newItem.style.borderLeft = '5px solid #f59e0b';
        newItem.style.background = '#fffbeb';
        newItem.style.padding = '15px';
        newItem.style.marginBottom = '10px';
        newItem.style.borderRadius = '8px';
        newItem.style.display = 'flex';
        newItem.style.justifyContent = 'space-between';
        newItem.style.alignItems = 'center';
        
        newItem.innerHTML = `
            <div>
                <strong>${type}</strong><br>
                <small>${location} | Submitted: ${new Date().toLocaleDateString()}</small>
            </div>
            <span style="color: #f59e0b; font-weight: bold;">PENDING</span>
        `;
        
        // Add new item to the top of the list
        queryList.prepend(newItem);
    }

// NOTIFICATION SYSTEM (Toast UI)
    function notify(msg, type) {
        if (!notifHub) return;

        const toast = document.createElement('div');
        toast.className = 'toast';

        // PUP Red theme for danger, Success Green for others
        const color = type === 'danger' ? 'rgb(161, 21, 21)' : '#10b981';
        
        toast.style.cssText = `
            background: white; 
            border-left: 5px solid ${color}; 
            padding: 15px; 
            margin-bottom: 10px; 
            border-radius: 5px; 
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
            animation: slideIn 0.3s ease;
        `;
        
        toast.innerHTML = `<strong>System:</strong> ${msg}`;
        notifHub.appendChild(toast);
        
        // Auto-remove notification after 4 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = '0.5s';
            setTimeout(() => toast.remove(), 500);
        }, 4000);
    }
});

// GLOBAL EMERGENCY HELPER
function quickSwitch(id) {
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(id);
    if (target) {
        target.style.display = 'block';
        window.scrollTo(0, 0);
    }
}