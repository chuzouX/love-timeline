import cors from 'cors';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { imageSize } from 'image-size';

dotenv.config();

const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';
const pinCode = process.env.PIN_CODE ?? '1314';
const jwtSecret = process.env.JWT_SECRET ?? 'kuromi-local-dev-secret';
const databasePath = path.resolve(process.cwd(), process.env.DATABASE_PATH ?? './server/data/kuromi.sqlite');
const galleryDir = path.resolve(process.cwd(), './server/uploads/gallery');

fs.mkdirSync(path.dirname(databasePath), { recursive: true });
fs.mkdirSync(galleryDir, { recursive: true });

const db = new Database(databasePath);
db.pragma('foreign_keys = ON');

type AuthRequest = Request & { user?: { unlocked: true } };
type DbEvent = {
  id: number;
  name: string;
  date: string;
  calendarType: 'solar' | 'lunar';
  lunarMonth: number | null;
  lunarDay: number | null;
  lunarIsLeapMonth: number;
  time: string | null;
  startTime: string | null;
  endTime: string | null;
  recurrence: 'none' | 'yearly';
  icon: string;
  description: string;
  color: string;
  tag: string;
  sortOrder: number;
};
type DbScheduleItem = {
  id: number;
  dayIndex: number;
  timeIndex: number;
  subject: string;
  person: 'her' | 'him' | 'both';
  duration: number;
};
type DbPeriodConfig = {
  id: number;
  cycleDays: number;
  periodDays: number;
};
type DbPeriodRecord = {
  id: number;
  startDate: string;
  endDate: string | null;
  note: string | null;
  symptoms: string;
  createdAt: string;
};
type DbGalleryImage = {
  id: number;
  filename: string;
  originalName: string;
  mimeType: string;
  width: number;
  height: number;
  size: number;
  createdAt: string;
};

const defaultDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
const defaultTimes = ['08:00', '10:10', '14:00', '16:10', '19:00'];

const defaultEvents = [
  { name: '我们的纪念日', date: '2023-10-20', calendarType: 'solar', lunarMonth: null, lunarDay: null, lunarIsLeapMonth: 0, time: '20:00', startTime: '20:00', endTime: null, recurrence: 'yearly', icon: '❤', description: '相遇的那一天', color: 'bg-pink-100 text-pink-600', tag: 'ANNIVERSARY', sortOrder: 1 },
  { name: '你的生日', date: '2026-03-25', calendarType: 'solar', lunarMonth: null, lunarDay: null, lunarIsLeapMonth: 0, time: '00:00', startTime: '00:00', endTime: null, recurrence: 'yearly', icon: '🎂', description: '全世界最可爱的人出生了', color: 'bg-purple-100 text-purple-600', tag: 'BIRTHDAY', sortOrder: 2 },
  { name: '情人节', date: '2026-02-14', calendarType: 'solar', lunarMonth: null, lunarDay: null, lunarIsLeapMonth: 0, time: '19:00', startTime: '19:00', endTime: null, recurrence: 'yearly', icon: '🌹', description: '浪漫的约会时间', color: 'bg-red-100 text-red-600', tag: 'LOVE', sortOrder: 3 },
  { name: '暑假放假', date: '2026-07-10', calendarType: 'solar', lunarMonth: null, lunarDay: null, lunarIsLeapMonth: 0, time: null, startTime: null, endTime: null, recurrence: 'none', icon: '🏖', description: '终于可以天天在一起啦', color: 'bg-blue-100 text-blue-600', tag: 'HOLIDAY', sortOrder: 4 },
];

const defaultSchedule = [
  { dayIndex: 0, timeIndex: 0, subject: '高等数学', person: 'her', duration: 2 },
  { dayIndex: 0, timeIndex: 2, subject: '大学物理', person: 'him', duration: 2 },
  { dayIndex: 1, timeIndex: 1, subject: '英语', person: 'both', duration: 2 },
  { dayIndex: 2, timeIndex: 0, subject: '计算机基础', person: 'her', duration: 2 },
  { dayIndex: 3, timeIndex: 3, subject: '体育', person: 'both', duration: 2 },
  { dayIndex: 4, timeIndex: 4, subject: '晚自习', person: 'both', duration: 2 },
] satisfies Array<Omit<DbScheduleItem, 'id'>>;

function createSchema() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      relationshipStartDate TEXT NOT NULL,
      herName TEXT,
      himName TEXT
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      date TEXT NOT NULL,
      calendarType TEXT NOT NULL DEFAULT 'solar' CHECK (calendarType IN ('solar', 'lunar')),
      lunarMonth INTEGER,
      lunarDay INTEGER,
      lunarIsLeapMonth INTEGER NOT NULL DEFAULT 0,
      time TEXT,
      startTime TEXT,
      endTime TEXT,
      recurrence TEXT NOT NULL DEFAULT 'yearly' CHECK (recurrence IN ('none', 'yearly')),
      icon TEXT NOT NULL,
      description TEXT NOT NULL,
      color TEXT NOT NULL,
      tag TEXT NOT NULL,
      sortOrder INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS schedule_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      daysJson TEXT NOT NULL,
      timesJson TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS schedule_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dayIndex INTEGER NOT NULL,
      timeIndex INTEGER NOT NULL,
      subject TEXT NOT NULL,
      person TEXT NOT NULL CHECK (person IN ('her', 'him', 'both')),
      duration INTEGER NOT NULL DEFAULT 2
    );

    CREATE TABLE IF NOT EXISTS period_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      cycleDays INTEGER NOT NULL,
      periodDays INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS period_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      startDate TEXT NOT NULL,
      endDate TEXT,
      note TEXT,
      symptoms TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gallery_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      filename TEXT NOT NULL UNIQUE,
      originalName TEXT NOT NULL,
      mimeType TEXT NOT NULL,
      width INTEGER NOT NULL,
      height INTEGER NOT NULL,
      size INTEGER NOT NULL,
      createdAt TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
  ensureColumn('events', 'calendarType', "TEXT NOT NULL DEFAULT 'solar' CHECK (calendarType IN ('solar', 'lunar'))");
  ensureColumn('events', 'lunarMonth', 'INTEGER');
  ensureColumn('events', 'lunarDay', 'INTEGER');
  ensureColumn('events', 'lunarIsLeapMonth', 'INTEGER NOT NULL DEFAULT 0');
  ensureColumn('events', 'time', 'TEXT');
  ensureColumn('events', 'startTime', 'TEXT');
  ensureColumn('events', 'endTime', 'TEXT');
  ensureColumn('events', 'recurrence', "TEXT NOT NULL DEFAULT 'yearly' CHECK (recurrence IN ('none', 'yearly'))");
  ensureColumn('schedule_items', 'duration', 'INTEGER NOT NULL DEFAULT 2');
  db.prepare('UPDATE events SET startTime = time WHERE startTime IS NULL AND time IS NOT NULL').run();
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, galleryDir),
    filename: (_req, file, callback) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
      callback(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    },
  }),
  limits: { fileSize: 12 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(new Error('Only image uploads are allowed'));
      return;
    }
    callback(null, true);
  },
});

function ensureColumn(table: string, column: string, definition: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  }
}

function seedDefaults() {
  db.prepare('INSERT OR IGNORE INTO profile (id, relationshipStartDate) VALUES (1, ?)').run('2023-10-20');
  db.prepare('INSERT OR IGNORE INTO schedule_config (id, daysJson, timesJson) VALUES (1, ?, ?)').run(
    JSON.stringify(defaultDays),
    JSON.stringify(defaultTimes),
  );
  db.prepare('INSERT OR IGNORE INTO period_config (id, cycleDays, periodDays) VALUES (1, 28, 5)').run();

  const eventCount = db.prepare('SELECT COUNT(*) as count FROM events').get() as { count: number };
  if (eventCount.count === 0) {
    const insert = db.prepare(`
      INSERT INTO events (name, date, calendarType, lunarMonth, lunarDay, lunarIsLeapMonth, time, startTime, endTime, recurrence, icon, description, color, tag, sortOrder)
      VALUES (@name, @date, @calendarType, @lunarMonth, @lunarDay, @lunarIsLeapMonth, @time, @startTime, @endTime, @recurrence, @icon, @description, @color, @tag, @sortOrder)
    `);
    const insertMany = db.transaction((events: typeof defaultEvents) => {
      for (const event of events) insert.run(event);
    });
    insertMany(defaultEvents);
  }

  const scheduleCount = db.prepare('SELECT COUNT(*) as count FROM schedule_items').get() as { count: number };
  if (scheduleCount.count === 0) {
    const insert = db.prepare(`
      INSERT INTO schedule_items (dayIndex, timeIndex, subject, person, duration)
      VALUES (@dayIndex, @timeIndex, @subject, @person, @duration)
    `);
    const insertMany = db.transaction((items: typeof defaultSchedule) => {
      for (const item of items) insert.run(item);
    });
    insertMany(defaultSchedule);
  }

  const periodCount = db.prepare('SELECT COUNT(*) as count FROM period_records').get() as { count: number };
  if (periodCount.count === 0) {
    db.prepare('INSERT INTO period_records (startDate, endDate, note, symptoms) VALUES (?, ?, ?, ?)').run(
      '2026-05-10',
      null,
      '默认记录',
      JSON.stringify([]),
    );
  }
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.header('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;

  if (!token) {
    res.status(401).json({ error: 'Missing token' });
    return;
  }

  try {
    jwt.verify(token, jwtSecret);
    req.user = { unlocked: true };
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

function assertDate(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${field} must use YYYY-MM-DD`);
  }
  return value;
}

function assertString(value: unknown, field: string, fallback?: string): string {
  if (value === undefined && fallback !== undefined) return fallback;
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${field} is required`);
  }
  return value.trim();
}

function assertInteger(value: unknown, field: string, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${field} must be an integer from ${min} to ${max}`);
  }
  return value;
}

function readSchedule() {
  const config = db.prepare('SELECT daysJson, timesJson FROM schedule_config WHERE id = 1').get() as {
    daysJson: string;
    timesJson: string;
  };
  const items = db.prepare('SELECT id, dayIndex, timeIndex, subject, person, duration FROM schedule_items ORDER BY dayIndex, timeIndex, id').all() as DbScheduleItem[];
  return {
    days: JSON.parse(config.daysJson) as string[],
    times: JSON.parse(config.timesJson) as string[],
    items,
  };
}

function readPeriod() {
  const config = db.prepare('SELECT id, cycleDays, periodDays FROM period_config WHERE id = 1').get() as DbPeriodConfig;
  const records = db.prepare('SELECT id, startDate, endDate, note, symptoms, createdAt FROM period_records ORDER BY startDate DESC, id DESC').all() as DbPeriodRecord[];
  const latestRecord = records[0];
  const today = toDateKey(new Date());
  const nextStartDate = latestRecord ? addDays(latestRecord.startDate, config.cycleDays) : null;
  const daysUntilNext = nextStartDate ? daysBetween(today, nextStartDate) : null;
  const ovulationDate = nextStartDate ? addDays(nextStartDate, -14) : null;
  const ovulationWindowStart = ovulationDate ? addDays(ovulationDate, -5) : null;
  const ovulationWindowEnd = ovulationDate ? addDays(ovulationDate, 1) : null;
  const daysUntilOvulation = ovulationDate ? daysBetween(today, ovulationDate) : null;
  const daysUntilOvulationWindow = ovulationWindowStart ? daysBetween(today, ovulationWindowStart) : null;
  const currentPhase = latestRecord ? getCyclePhase(today, latestRecord.startDate, config.cycleDays, config.periodDays) : null;

  return {
    config,
    records: records.map((record) => ({
      ...record,
      symptoms: JSON.parse(record.symptoms) as string[],
    })),
    prediction: {
      nextStartDate,
      daysUntilNext,
      ovulationDate,
      ovulationWindowStart,
      ovulationWindowEnd,
      daysUntilOvulation,
      daysUntilOvulationWindow,
      currentPhase,
      currentPhaseLabel: getCyclePhaseLabel(currentPhase),
    },
  };
}

function addDays(date: string, days: number) {
  const next = new Date(`${date}T00:00:00`);
  next.setDate(next.getDate() + days);
  return next.toISOString().slice(0, 10);
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysBetween(fromDate: string, toDate: string) {
  return Math.ceil((Date.parse(`${toDate}T00:00:00`) - Date.parse(`${fromDate}T00:00:00`)) / 86_400_000);
}

function getCyclePhase(today: string, cycleStartDate: string, cycleDays: number, periodDays: number) {
  const daysSinceStart = daysBetween(cycleStartDate, today);
  const dayInCycle = ((daysSinceStart % cycleDays) + cycleDays) % cycleDays + 1;
  const ovulationDay = cycleDays - 13;
  const ovulationWindowStartDay = Math.max(periodDays + 1, ovulationDay - 5);
  const ovulationWindowEndDay = Math.min(cycleDays, ovulationDay + 1);

  if (dayInCycle <= periodDays) return 'menstrual';
  if (dayInCycle >= ovulationWindowStartDay && dayInCycle <= ovulationWindowEndDay) return 'ovulation';
  if (dayInCycle < ovulationWindowStartDay) return 'follicular';
  return 'luteal';
}

function getCyclePhaseLabel(phase: string | null) {
  if (phase === 'menstrual') return '经期';
  if (phase === 'follicular') return '卵泡期';
  if (phase === 'ovulation') return '排卵期';
  if (phase === 'luteal') return '黄体期';
  return null;
}

function route(handler: (req: Request, res: Response) => void) {
  return (req: Request, res: Response) => {
    try {
      handler(req, res);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unexpected error';
      res.status(400).json({ error: message });
    }
  };
}

createSchema();
seedDefaults();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());
app.use('/api/gallery/files', express.static(galleryDir, {
  immutable: true,
  maxAge: '30d',
}));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

app.post('/api/auth/unlock', route((req, res) => {
  if (req.body?.pin !== pinCode) {
    res.status(401).json({ error: 'PIN is incorrect' });
    return;
  }
  const token = jwt.sign({ unlocked: true }, jwtSecret, { expiresIn: '12h' });
  res.json({ token });
}));

app.get('/api/profile', route((_req, res) => {
  const profile = db.prepare('SELECT relationshipStartDate, herName, himName FROM profile WHERE id = 1').get();
  res.json(profile);
}));

app.put('/api/profile', requireAuth, route((req, res) => {
  const relationshipStartDate = assertDate(req.body?.relationshipStartDate, 'relationshipStartDate');
  const herName = typeof req.body?.herName === 'string' ? req.body.herName.trim() : null;
  const himName = typeof req.body?.himName === 'string' ? req.body.himName.trim() : null;
  db.prepare('UPDATE profile SET relationshipStartDate = ?, herName = ?, himName = ? WHERE id = 1').run(relationshipStartDate, herName, himName);
  res.json(db.prepare('SELECT relationshipStartDate, herName, himName FROM profile WHERE id = 1').get());
}));

app.get('/api/events', route((_req, res) => {
  const events = db.prepare(`${eventSelectSql()} ORDER BY sortOrder, date, id`).all() as DbEvent[];
  res.json(events);
}));

app.post('/api/events', requireAuth, route((req, res) => {
  const event = readEventPayload(req.body);
  const result = db.prepare(`
    INSERT INTO events (name, date, calendarType, lunarMonth, lunarDay, lunarIsLeapMonth, time, startTime, endTime, recurrence, icon, description, color, tag, sortOrder)
    VALUES (@name, @date, @calendarType, @lunarMonth, @lunarDay, @lunarIsLeapMonth, @time, @startTime, @endTime, @recurrence, @icon, @description, @color, @tag, @sortOrder)
  `).run(event);
  res.status(201).json(db.prepare(`${eventSelectSql()} WHERE id = ?`).get(result.lastInsertRowid));
}));

app.put('/api/events/:id', requireAuth, route((req, res) => {
  const id = Number(req.params.id);
  const event = readEventPayload(req.body);
  db.prepare(`
    UPDATE events
    SET name = @name, date = @date, calendarType = @calendarType, lunarMonth = @lunarMonth, lunarDay = @lunarDay, lunarIsLeapMonth = @lunarIsLeapMonth, time = @time, startTime = @startTime, endTime = @endTime, recurrence = @recurrence, icon = @icon, description = @description, color = @color, tag = @tag, sortOrder = @sortOrder
    WHERE id = @id
  `).run({ id, ...event });
  res.json(db.prepare(`${eventSelectSql()} WHERE id = ?`).get(id));
}));

app.delete('/api/events/:id', requireAuth, route((req, res) => {
  db.prepare('DELETE FROM events WHERE id = ?').run(Number(req.params.id));
  res.status(204).end();
}));

app.get('/api/gallery', route((_req, res) => {
  const images = db.prepare(`
    SELECT id, filename, originalName, mimeType, width, height, size, createdAt
    FROM gallery_images
    ORDER BY CAST(width AS REAL) / NULLIF(height, 0) DESC, createdAt DESC
  `).all() as DbGalleryImage[];
  res.json(images.map(toGalleryResponse));
}));

app.post('/api/gallery', requireAuth, upload.single('image'), route((req, res) => {
  if (!req.file) {
    res.status(400).json({ error: 'image file is required' });
    return;
  }

  try {
    const dimensions = imageSize(fs.readFileSync(req.file.path));
    if (!dimensions.width || !dimensions.height) throw new Error('Unable to read image dimensions');

    const result = db.prepare(`
      INSERT INTO gallery_images (filename, originalName, mimeType, width, height, size)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(req.file.filename, req.file.originalname, req.file.mimetype, dimensions.width, dimensions.height, req.file.size);
    const image = db.prepare('SELECT id, filename, originalName, mimeType, width, height, size, createdAt FROM gallery_images WHERE id = ?').get(result.lastInsertRowid) as DbGalleryImage;
    res.status(201).json(toGalleryResponse(image));
  } catch (error) {
    fs.rmSync(req.file.path, { force: true });
    throw error;
  }
}));

app.delete('/api/gallery/:id', requireAuth, route((req, res) => {
  const image = db.prepare('SELECT id, filename, originalName, mimeType, width, height, size, createdAt FROM gallery_images WHERE id = ?').get(Number(req.params.id)) as DbGalleryImage | undefined;
  if (image) {
    db.prepare('DELETE FROM gallery_images WHERE id = ?').run(image.id);
    fs.rmSync(path.join(galleryDir, image.filename), { force: true });
  }
  res.status(204).end();
}));

app.get('/api/schedule', route((_req, res) => {
  res.json(readSchedule());
}));

app.put('/api/schedule', requireAuth, route((req, res) => {
  const days = Array.isArray(req.body?.days) ? req.body.days.map((day: unknown) => assertString(day, 'day')) : defaultDays;
  const times = Array.isArray(req.body?.times) ? req.body.times.map((time: unknown) => assertString(time, 'time')) : defaultTimes;
  const items = Array.isArray(req.body?.items) ? req.body.items.map((item: unknown) => readScheduleItemPayload(item, days.length, times.length)) : [];

  const save = db.transaction(() => {
    db.prepare('UPDATE schedule_config SET daysJson = ?, timesJson = ? WHERE id = 1').run(JSON.stringify(days), JSON.stringify(times));
    db.prepare('DELETE FROM schedule_items').run();
    const insert = db.prepare('INSERT INTO schedule_items (dayIndex, timeIndex, subject, person, duration) VALUES (@dayIndex, @timeIndex, @subject, @person, @duration)');
    for (const item of items) insert.run(item);
  });
  save();
  res.json(readSchedule());
}));

app.get('/api/period', route((_req, res) => {
  res.json(readPeriod());
}));

app.put('/api/period/config', requireAuth, route((req, res) => {
  const cycleDays = assertInteger(req.body?.cycleDays, 'cycleDays', 15, 60);
  const periodDays = assertInteger(req.body?.periodDays, 'periodDays', 1, 14);
  db.prepare('UPDATE period_config SET cycleDays = ?, periodDays = ? WHERE id = 1').run(cycleDays, periodDays);
  res.json(readPeriod());
}));

app.post('/api/period/records', requireAuth, route((req, res) => {
  const record = readPeriodRecordPayload(req.body);
  const result = db.prepare('INSERT INTO period_records (startDate, endDate, note, symptoms) VALUES (@startDate, @endDate, @note, @symptoms)').run(record);
  res.status(201).json(readPeriodRecordById(Number(result.lastInsertRowid)));
}));

app.put('/api/period/records/:id', requireAuth, route((req, res) => {
  const id = Number(req.params.id);
  const record = readPeriodRecordPayload(req.body);
  db.prepare('UPDATE period_records SET startDate = @startDate, endDate = @endDate, note = @note, symptoms = @symptoms WHERE id = @id').run({ id, ...record });
  res.json(readPeriodRecordById(id));
}));

app.delete('/api/period/records/:id', requireAuth, route((req, res) => {
  db.prepare('DELETE FROM period_records WHERE id = ?').run(Number(req.params.id));
  res.status(204).end();
}));

function readEventPayload(body: unknown) {
  const value = body as Record<string, unknown>;
  const recurrence = value.recurrence === 'none' || value.recurrence === 'yearly' ? value.recurrence : 'yearly';
  const calendarType = value.calendarType === 'lunar' ? 'lunar' : 'solar';
  const lunarMonth = calendarType === 'lunar' ? assertInteger(value.lunarMonth, 'lunarMonth', 1, 12) : null;
  const lunarDay = calendarType === 'lunar' ? assertInteger(value.lunarDay, 'lunarDay', 1, 30) : null;
  return {
    name: assertString(value.name, 'name'),
    date: assertDate(value.date, 'date'),
    calendarType,
    lunarMonth,
    lunarDay,
    lunarIsLeapMonth: calendarType === 'lunar' && value.lunarIsLeapMonth === true ? 1 : 0,
    time: assertTime(value.startTime ?? value.time),
    startTime: assertTime(value.startTime ?? value.time),
    endTime: assertTime(value.endTime),
    recurrence,
    icon: assertString(value.icon, 'icon', '❤'),
    description: assertString(value.description, 'description', ''),
    color: assertString(value.color, 'color', 'bg-pink-100 text-pink-600'),
    tag: assertString(value.tag, 'tag', 'MEMORY'),
    sortOrder: typeof value.sortOrder === 'number' && Number.isInteger(value.sortOrder) ? value.sortOrder : 0,
  };
}

function eventSelectSql() {
  return 'SELECT id, name, date, calendarType, lunarMonth, lunarDay, lunarIsLeapMonth, time, startTime, endTime, recurrence, icon, description, color, tag, sortOrder FROM events';
}

function toGalleryResponse(image: DbGalleryImage) {
  const filePath = path.join(galleryDir, image.filename);
  const size = fs.existsSync(filePath) ? fs.statSync(filePath).size : image.size;
  return {
    ...image,
    size,
    aspectRatio: image.width / image.height,
    url: `/api/gallery/files/${image.filename}`,
  };
}

function assertTime(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) {
    throw new Error('time must use HH:mm');
  }
  const [hour, minute] = value.split(':').map(Number);
  if (hour > 23 || minute > 59) throw new Error('time must use HH:mm');
  return value;
}

function readScheduleItemPayload(item: unknown, dayCount: number, timeCount: number) {
  const value = item as Record<string, unknown>;
  const person = value.person;
  if (person !== 'her' && person !== 'him' && person !== 'both') {
    throw new Error('person must be her, him, or both');
  }
  return {
    dayIndex: assertInteger(value.dayIndex, 'dayIndex', 0, dayCount - 1),
    timeIndex: assertInteger(value.timeIndex, 'timeIndex', 0, timeCount - 1),
    subject: assertString(value.subject, 'subject'),
    person,
    duration: typeof value.duration === 'number' ? assertInteger(value.duration, 'duration', 1, 10) : 2,
  };
}

function readPeriodRecordPayload(body: unknown) {
  const value = body as Record<string, unknown>;
  const symptoms = Array.isArray(value.symptoms) ? value.symptoms.map((symptom) => assertString(symptom, 'symptom')) : [];
  return {
    startDate: assertDate(value.startDate, 'startDate'),
    endDate: value.endDate ? assertDate(value.endDate, 'endDate') : null,
    note: typeof value.note === 'string' && value.note.trim().length > 0 ? value.note.trim() : null,
    symptoms: JSON.stringify(symptoms),
  };
}

function readPeriodRecordById(id: number) {
  const record = db.prepare('SELECT id, startDate, endDate, note, symptoms, createdAt FROM period_records WHERE id = ?').get(id) as DbPeriodRecord | undefined;
  if (!record) throw new Error('period record not found');
  return {
    ...record,
    symptoms: JSON.parse(record.symptoms) as string[],
  };
}

app.listen(port, host, () => {
  console.log(`Kuromi API listening on http://${host}:${port}`);
});
