module.exports = {
  apps: [
    {
      name: "stm-backend",
      script: "server.js",
      cwd: "c:/Users/manoj/Personal/student-task-managerweb/student-task-manager/backend",
      env: {
        PORT: 5001
      }
    },
    {
      name: "stm-frontend",
      script: "python",
      args: "-m http.server 3001",
      cwd: "c:/Users/manoj/Personal/student-task-managerweb/student-task-manager/frontend"
    }
  ]
};
