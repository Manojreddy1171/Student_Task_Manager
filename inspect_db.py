import sqlite3
conn = sqlite3.connect('database/student_task_manager.db')
c = conn.cursor()
c.execute("SELECT name FROM sqlite_master WHERE type='table'")
print(c.fetchall())
conn.close()
