// js/api.js — Firebase API helper functions

function logout() {
  firebase.auth().signOut().then(() => {
    window.location.href = '/';
  });
}

// Auth guard — call on every protected page. 
// Uses Firebase auth state observer.
function requireAuth(role = null, callback) {
  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = '/';
      return;
    }
    
    // Enforce email verification
    if (!user.emailVerified) {
      alert("Please verify your email address to access the dashboard. Check your spam folder if you didn't receive it.");
      firebase.auth().signOut().then(() => {
        window.location.href = '/';
      });
      return;
    }
    
    // Check user profile in Firestore
    let userDoc;
    try {
      userDoc = await db.collection('users').doc(user.uid).get();
    } catch (error) {
      console.error("Firestore connection error (possibly blocked by adblocker):", error);
      alert("Unable to connect to the database. This is usually caused by an adblocker or strict browser privacy settings blocking Firebase. Please whitelist this site or disable your adblocker to continue.");
      return;
    }
    
    let userProfile = { 
      id: user.uid, 
      name: user.displayName || 'User', 
      email: user.email,
      role: 'student', 
      xp_points: 0,
      is_active: true
    };
    
    if (userDoc.exists) {
      userProfile = { id: user.uid, ...userDoc.data() };
    } else {
      try {
        // Create default profile for new signups
        await db.collection('users').doc(user.uid).set(userProfile);
      } catch (error) {
        console.error("Error creating user profile:", error);
      }
    }
    
    // Check role based authorization
    if (role && userProfile.role !== role && !(role === 'admin' && userProfile.role === 'superadmin')) {
      window.location.href = '/';
      return;
    }
    
    callback(userProfile);
  });
}

// Specific helpers mapped to Firebase Firestore
const API = {
  // Tasks
  getTasks: async (filters = '') => {
    try {
      const snapshot = await db.collection('tasks').get();
      let tasks = [];
      snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
      return { success: true, data: tasks };
    } catch(e) { console.error(e); return { success: false }; }
  },
  createTask: async (task) => {
    try {
      const user = firebase.auth().currentUser;
      const docRef = await db.collection('tasks').add({
        ...task,
        assigned_to: task.assigned_to || (user ? user.uid : null),
        progress: task.progress || 0,
        created_at: firebase.firestore.FieldValue.serverTimestamp(),
        status: task.status || 'pending'
      });
      return { success: true, data: { id: docRef.id } };
    } catch(e) { console.error(e); return { success: false, message: e.message }; }
  },
  updateTask: async (id, data) => {
    try {
      await db.collection('tasks').doc(id).update(data);
      return { success: true };
    } catch(e) { console.error(e); return { success: false }; }
  },
  deleteTask: async (id) => {
    try {
      await db.collection('tasks').doc(id).delete();
      return { success: true };
    } catch(e) { console.error(e); return { success: false }; }
  },

  // Analytics / Dashboard Stats
  getMyStats: async () => {
    const user = firebase.auth().currentUser;
    if(!user) return {success: false};
    const userDoc = await db.collection('users').doc(user.uid).get();
    const data = userDoc.data() || {};
    
    // Query tasks
    const tasksSnapshot = await db.collection('tasks').get(); // Simplified for frontend demo
    let completed = 0, pending = 0, overdue = 0;
    const now = new Date();
    
    tasksSnapshot.forEach(doc => {
      const t = doc.data();
      if(t.assigned_to === user.uid || t.assigned_to === null) {
         if(t.status === 'completed') completed++;
         else {
           pending++;
           if(t.deadline && new Date(t.deadline) < now) overdue++;
         }
      }
    });

    const total = completed + pending;
    const productivity = total === 0 ? 0 : Math.round((completed / total) * 100);

    return { success: true, data: {
      xp_points: data.xp_points || 0,
      totalTasks: total,
      completedTasks: completed,
      pendingTasks: pending,
      overdueTasks: overdue,
      productivity: productivity,
      myRank: 1, 
      upcomingDeadlines: [], 
      leaderboard: [ { id: user.uid, name: data.name || 'User', xp_points: data.xp_points || 0 } ]
    }};
  },
  getOverview: async () => {
    const tasksSnap = await db.collection('tasks').get();
    const usersSnap = await db.collection('users').get();
    let completed = 0;
    let high = 0, medium = 0, low = 0;
    
    tasksSnap.forEach(d => { 
      const t = d.data();
      if (t.status === 'completed') completed++; 
      if (t.priority === 'high') high++;
      if (t.priority === 'medium') medium++;
      if (t.priority === 'low') low++;
    });
    
    const totalTasks = tasksSnap.size;
    
    return { success: true, data: {
      totalUsers: usersSnap.size,
      totalTasks,
      completedTasks: completed,
      completionRate: totalTasks ? Math.round((completed/totalTasks)*100) : 0,
      completionByUser: [], // Simplified
      tasksByPriority: [ {priority: 'high', count: high}, {priority: 'medium', count: medium}, {priority: 'low', count: low} ],
      weeklyTasks: [ {day: 'Mon', count: 1}, {day: 'Tue', count: 2} ] // Mock data for chart
    }};
  },

  // Profile
  getProfile: async () => {
    try {
      const user = firebase.auth().currentUser;
      if (!user) return { success: false };
      const userDoc = await db.collection('users').doc(user.uid).get();
      const userData = userDoc.data() || {};
      
      const tasksSnapshot = await db.collection('tasks').where('assigned_to', '==', user.uid).get();
      let completed = 0, pending = 0, overdue = 0;
      const now = new Date();
      let submittedFiles = [];
      let categoryPerformance = {};
      
      tasksSnapshot.forEach(doc => {
        const t = doc.data();
        if(t.status === 'completed') {
          completed++;
          if (t.submission_date) submittedFiles.push({ name: t.title + " Submission", date: t.submission_date });
          else submittedFiles.push({ name: t.title + " Submission", date: t.created_at?.toDate()?.toISOString() || new Date().toISOString() });
        } else {
          pending++;
          if(t.deadline && new Date(t.deadline) < now) overdue++;
        }
        
        if (t.category_name) {
          if (!categoryPerformance[t.category_name]) categoryPerformance[t.category_name] = { total: 0, completed: 0 };
          categoryPerformance[t.category_name].total++;
          if (t.status === 'completed') categoryPerformance[t.category_name].completed++;
        }
      });
      
      const total = completed + pending;
      const productivity = total === 0 ? 0 : Math.round((completed / total) * 100);
      
      return { success: true, data: {
        ...userData,
        email: user.email,
        lastSignInTime: user.metadata?.lastSignInTime,
        stats: { total, completed, pending, overdue, productivity },
        submittedFiles: submittedFiles.slice(0, 5), // Top 5
        categoryPerformance
      }};
    } catch(e) { console.error(e); return { success: false, message: e.message }; }
  },
  
  updateProfile: async (data) => {
    try {
      const user = firebase.auth().currentUser;
      if (!user) return { success: false };
      await db.collection('users').doc(user.uid).update(data);
      // Optional: Update Firebase Auth Profile if name changed
      if (data.name) await user.updateProfile({ displayName: data.name });
      return { success: true };
    } catch(e) { console.error(e); return { success: false, message: e.message }; }
  },

  // Notifications
  getNotifs: async () => {
    return { success: true, data: [] }; // Mock empty
  },
  markRead: async (id) => { return {success: true}; },
  markAllRead: async () => { return {success: true}; },

  // Categories
  getCategories: async () => {
    try {
      const snapshot = await db.collection('categories').get();
      let cats = [];
      snapshot.forEach(doc => cats.push({ id: doc.id, ...doc.data() }));
      return { success: true, data: cats };
    } catch(e) { console.error(e); return { success: false, data: [] }; }
  },
  createCategory: async (name) => {
    try {
      const docRef = await db.collection('categories').add({ category_name: name });
      return { success: true, data: { id: docRef.id } };
    } catch(e) { console.error(e); return { success: false }; }
  },

  // Events
  getEvents: async () => {
    try {
      const user = firebase.auth().currentUser;
      if (!user) return { success: false, data: [] };
      const snapshot = await db.collection('events').where('created_by', '==', user.uid).get();
      let events = [];
      snapshot.forEach(doc => events.push({ id: doc.id, ...doc.data() }));
      return { success: true, data: events };
    } catch(e) { console.error(e); return { success: false, data: [] }; }
  },
  createEvent: async (eventData) => {
    try {
      const user = firebase.auth().currentUser;
      if (!user) throw new Error("Not authenticated");
      const docRef = await db.collection('events').add({
        ...eventData,
        created_by: user.uid,
        created_at: firebase.firestore.FieldValue.serverTimestamp()
      });
      return { success: true, data: { id: docRef.id } };
    } catch(e) { console.error(e); return { success: false, message: e.message }; }
  },

  // Groups Mock Data
  getGroups: async () => {
    return { success: true, data: [
      { id: 'G101', name: 'Alpha Coders', project_title: 'Student Task Manager', created_by: 'Admin', start_date: '2026-05-01', due_date: '2026-05-20' },
      { id: 'G102', name: 'Tech Titans', project_title: 'AI Chatbot System', created_by: 'Admin', start_date: '2026-05-03', due_date: '2026-05-25' },
      { id: 'G103', name: 'Code Warriors', project_title: 'Library Management System', created_by: 'Admin', start_date: '2026-05-05', due_date: '2026-05-28' }
    ]};
  },

  getGroupMembers: async (groupId) => {
    // Only returning G101 for the mock, as provided by user
    if (groupId !== 'G101') return { success: true, data: [] };
    return { success: true, data: [
      { member_id: 1, student_name: 'Manoj Reddy', role: 'Team Leader', assigned_task: 'Backend Development' },
      { member_id: 2, student_name: 'Rahul Kumar', role: 'Member', assigned_task: 'Frontend Design' },
      { member_id: 3, student_name: 'Sneha Patel', role: 'Member', assigned_task: 'Database Design' },
      { member_id: 4, student_name: 'Kiran Kumar', role: 'Member', assigned_task: 'Testing & Documentation' }
    ]};
  },

  getGroupTasks: async (groupId) => {
    if (groupId !== 'G101') return { success: true, data: [] };
    return { success: true, data: [
      { task_id: 'T101', task_title: 'Design Login Page', assigned_to: 'Rahul Kumar', priority: 'High', status: 'Completed', due_date: '2026-05-05' },
      { task_id: 'T102', task_title: 'Create REST API', assigned_to: 'Manoj Reddy', priority: 'High', status: 'In Progress', due_date: '2026-05-08' },
      { task_id: 'T103', task_title: 'Database Schema Design', assigned_to: 'Sneha Patel', priority: 'Medium', status: 'Pending', due_date: '2026-05-07' },
      { task_id: 'T104', task_title: 'Project Testing', assigned_to: 'Kiran Kumar', priority: 'Medium', status: 'Pending', due_date: '2026-05-15' }
    ]};
  },

  getGroupChat: async (groupId) => {
    if (groupId !== 'G101') return { success: true, data: [] };
    return { success: true, data: [
      { message_id: 'M1', sender: 'Manoj Reddy', message: 'API development started', time: '10:30 AM' },
      { message_id: 'M2', sender: 'Rahul Kumar', message: 'Login page completed', time: '11:00 AM' },
      { message_id: 'M3', sender: 'Sneha Patel', message: 'Database tables created', time: '12:15 PM' }
    ]};
  },

  getGroupFiles: async (groupId) => {
    if (groupId !== 'G101') return { success: true, data: [] };
    return { success: true, data: [
      { file_id: 'F1', uploaded_by: 'Rahul Kumar', file_name: 'login_ui.zip', upload_date: '2026-05-05' },
      { file_id: 'F2', uploaded_by: 'Sneha Patel', file_name: 'database_schema.sql', upload_date: '2026-05-06' },
      { file_id: 'F3', uploaded_by: 'Manoj Reddy', file_name: 'backend_api.zip', upload_date: '2026-05-07' }
    ]};
  },

  // Achievements
  getAchievements: async () => {
    try {
      const user = firebase.auth().currentUser;
      if (!user) return { success: false, error: 'Unauthorized' };

      const snap = await db.collection('tasks').where('user_id', '==', user.uid).get();
      let totalTasks = 0;
      let completedTasks = 0;

      snap.forEach(doc => {
        totalTasks++;
        if (doc.data().status === 'completed') completedTasks++;
      });

      const achievements = [
        {
          name: "First Step",
          description: "Create your first task",
          icon: "⭐",
          xp_bonus: 10,
          earned: totalTasks >= 1,
          earned_at: totalTasks >= 1 ? new Date().toISOString() : null
        },
        {
          name: "Task Master",
          description: "Create 5 tasks",
          icon: "📝",
          xp_bonus: 50,
          earned: totalTasks >= 5,
          earned_at: totalTasks >= 5 ? new Date().toISOString() : null
        },
        {
          name: "First Completion",
          description: "Complete your first task",
          icon: "✅",
          xp_bonus: 20,
          earned: completedTasks >= 1,
          earned_at: completedTasks >= 1 ? new Date().toISOString() : null
        },
        {
          name: "Productivity Ninja",
          description: "Complete 5 tasks",
          icon: "🥷",
          xp_bonus: 100,
          earned: completedTasks >= 5,
          earned_at: completedTasks >= 5 ? new Date().toISOString() : null
        },
        {
          name: "Unstoppable",
          description: "Complete 10 tasks",
          icon: "🔥",
          xp_bonus: 250,
          earned: completedTasks >= 10,
          earned_at: completedTasks >= 10 ? new Date().toISOString() : null
        }
      ];

      return { success: true, data: achievements };
    } catch (err) {
      console.error('Error fetching achievements:', err);
      return { success: false, data: [] };
    }
  },

  // Generic REST-like wrappers adapted for Firestore
  get: async (url) => {
    if (url === '/users') {
      const snap = await db.collection('users').get();
      let users = [];
      snap.forEach(d => users.push({id: d.id, ...d.data()}));
      return {success: true, data: users};
    }
    if (url === '/events') {
      return API.getEvents();
    }
    return {success: false};
  },
  post: async (url, body) => {
    if (url.startsWith('/tasks/') && url.endsWith('/submit')) {
      const taskId = url.split('/')[2];
      await db.collection('tasks').doc(taskId).update({status: 'completed'});
      return {success: true, message: 'Task marked as completed!'};
    }
    if (url === '/groups') {
      await db.collection('groups').add(body);
      return {success: true};
    }
    if (url === '/tasks') {
       return API.createTask(body);
    }
    if (url === '/events') {
       return API.createEvent(body);
    }
    return {success: false};
  },
  put: async (url, body) => {
     if (url.startsWith('/users/') && url.endsWith('/toggle')) {
        // Mock toggle
        return {success: true};
     }
     return {success: false};
  },
  delete: async (url) => {
    if (url.startsWith('/tasks/')) {
       const id = url.split('/')[2];
       return API.deleteTask(id);
    }
    return {success: false};
  }
};

// Format deadline date nicely
function formatDate(dt) {
  if (!dt) return '';
  const d = new Date(dt);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Priority badge HTML
function priorityBadge(p) {
  const pLower = (p || '').toLowerCase();
  const map = { 
    urgent: 'background: rgba(248,113,113,.15); color: #f87171;', 
    high: 'background: rgba(248,113,113,.1); color: #f87171;', 
    medium: 'background: rgba(251,191,36,.1); color: #fbbf24;', 
    low: 'background: rgba(74,222,128,.1); color: #4ade80;' 
  };
  return `<span class="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider" style="${map[pLower] || 'background: rgba(139,144,167,.1); color: #8b90a7;'}">${p || 'None'}</span>`;
}

// Status badge HTML
function statusBadge(s) {
  const sLower = (s || '').toLowerCase().replace(' ', '_');
  const map = {
    pending: 'background: rgba(139,144,167,.1); color: #8b90a7;',
    in_progress: 'background: rgba(79,195,247,.1); color: #4fc3f7;',
    completed: 'background: rgba(74,222,128,.1); color: #4ade80;',
    overdue: 'background: rgba(248,113,113,.1); color: #f87171;'
  };
  return `<span class="text-[10px] px-2 py-0.5 rounded font-bold uppercase tracking-wider" style="${map[sLower] || 'background: rgba(139,144,167,.1); color: #8b90a7;'}">${(s || 'Pending').replace('_', ' ')}</span>`;
}
