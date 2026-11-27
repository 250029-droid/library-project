const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Ma'lumotlar bazasini ulash (loyiha asosiy papkasidagi library.db ga ulanadi)
const dbPath = path.resolve(__dirname, '../library.db');
const db = new sqlite3.Database(dbPath, (err) => {
	if (err) {
		console.error('Bazaga ulanishda xato:', err.message);
	} else {
		console.log('SQLite bazasiga muvaffaqiyatli ulandi.');
	}
});

// Jadval mavjud bo'lmasa avtomatik yaratish (Database a'zosi kodi kelgunicha ishlashi uchun)
db.run(`
	CREATE TABLE IF NOT EXISTS books (
		id INTEGER PRIMARY KEY AUTOINCREMENT,
		title TEXT NOT NULL,
		author TEXT NOT NULL,
		category TEXT,
		year INTEGER,
		available INTEGER DEFAULT 1
	)
`);

// 1. Barcha kitoblarni olish va qidirish (GET /api/books)
app.get('/api/books', (req, res) => {
	const search = req.query.search || '';
	const sql = `SELECT * FROM books WHERE title LIKE ? OR author LIKE ? ORDER BY id DESC`;
	db.all(sql, [`%${search}%`, `%${search}%`], (err, rows) => {
		if (err) return res.status(500).json({ error: err.message });
		res.json(rows);
	});
});

// 2. Yangi kitob qo'shish (POST /api/books)
app.post('/api/books', (req, res) => {
	const { title, author, category, year } = req.body;
	if (!title || !author) {
		return res.status(400).json({ error: 'Kitob nomi va muallif majburiy!' });
	}
	const sql = `INSERT INTO books (title, author, category, year) VALUES (?, ?, ?, ?)`;
	db.run(sql, [title, author, category || 'Boshqa', year || 2024], function (err) {
		if (err) return res.status(500).json({ error: err.message });
		res.status(201).json({ id: this.lastID, title, author, category, year, available: 1 });
	});
});

// 3. Kitob holatini o'zgartirish: Ijaraga olish / Qaytarish (PUT /api/books/:id/toggle)
app.put('/api/books/:id/toggle', (req, res) => {
	const { id } = req.params;
	db.get(`SELECT available FROM books WHERE id = ?`, [id], (err, row) => {
		if (err) return res.status(500).json({ error: err.message });
		if (!row) return res.status(404).json({ error: 'Kitob topilmadi' });

		const newStatus = row.available === 1 ? 0 : 1;
		db.run(`UPDATE books SET available = ? WHERE id = ?`, [newStatus, id], (err) => {
			if (err) return res.status(500).json({ error: err.message });
			res.json({ id: Number(id), available: newStatus });
		});
	});
});

// 4. Kitobni o'chirish (DELETE /api/books/:id)
app.delete('/api/books/:id', (req, res) => {
	const { id } = req.params;
	db.run(`DELETE FROM books WHERE id = ?`, [id], function (err) {
		if (err) return res.status(500).json({ error: err.message });
		res.json({ deletedId: Number(id) });
	});
});

app.listen(PORT, () => {
	console.log(`Server http://localhost:${PORT} portida ishga tushdi`);
});
