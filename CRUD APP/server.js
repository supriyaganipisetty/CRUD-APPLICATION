// Simple CRUD server using Express + better-sqlite3
const express = require('express');
const path = require('path');
const Database = require('better-sqlite3');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Initialize DB
const db = new Database(path.join(__dirname, 'data.db'));
db.pragma('journal_mode = WAL');
db.prepare(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    body TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// Prepared statements
const insertNote = db.prepare('INSERT INTO notes (title, body) VALUES (?, ?)');
const getAllNotes = db.prepare('SELECT id, title, body, created_at, updated_at FROM notes ORDER BY updated_at DESC');
const getNoteById = db.prepare('SELECT id, title, body, created_at, updated_at FROM notes WHERE id = ?');
const updateNote = db.prepare('UPDATE notes SET title = ?, body = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
const deleteNote = db.prepare('DELETE FROM notes WHERE id = ?');

// API routes
app.get('/api/notes', (req, res) => {
  try {
    res.json(getAllNotes.all());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch notes' });
  }
});

app.get('/api/notes/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' });
  const row = getNoteById.get(id);
  if (!row) return res.status(404).json({ error: 'Note not found' });
  res.json(row);
});

app.post('/api/notes', (req, res) => {
  const { title, body } = req.body;
  if (!title || typeof title !== 'string') return res.status(400).json({ error: 'Title is required' });
  const info = insertNote.run(title.trim(), (body || '').toString());
  const created = getNoteById.get(info.lastInsertRowid);
  res.status(201).json(created);
});

app.put('/api/notes/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, body } = req.body;
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' });
  if (!title || typeof title !== 'string') return res.status(400).json({ error: 'Title is required' });
  const info = updateNote.run(title.trim(), (body || '').toString(), id);
  if (info.changes === 0) return res.status(404).json({ error: 'Note not found' });
  const updated = getNoteById.get(id);
  res.json(updated);
});

app.delete('/api/notes/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) return res.status(400).json({ error: 'Invalid id' });
  const info = deleteNote.run(id);
  if (info.changes === 0) return res.status(404).json({ error: 'Note not found' });
  res.status(204).end();
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
