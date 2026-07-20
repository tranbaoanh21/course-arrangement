import { Router } from 'express';
import { pool, withTransaction } from '../db.js';
import { config } from '../config.js';
import { authenticate } from '../middleware/auth.js';
import { fetchCourses, fetchSectionsForSchedule, getOrCreateSemester } from '../repositories/courses.js';
import { applyRequiredSections, generateCompactSchedules, getScheduleMetrics, sectionConflicts } from '../services/scheduler.js';
import { parseOrThrow, scheduleSchema } from '../validation.js';

export const scheduleRouter = Router();
scheduleRouter.use(authenticate);

scheduleRouter.post('/generate', async (req, res) => {
  const semester = String(req.body.semester || 'HK261');
  const courses = await fetchCourses(req.user.id, semester);
  if (!courses.length) return res.status(400).json({ message: 'Hãy thêm ít nhất một môn học trước.' });
  if (courses.some((course) => !course.sections.length)) {
    return res.status(400).json({ message: 'Mỗi môn cần có ít nhất một lớp.' });
  }
  const hasLocalOverride = !config.isProduction
    && config.localScheduleOverrideEmail
    && req.user.email.toLowerCase() === config.localScheduleOverrideEmail.toLowerCase();
  const effectiveCourses = hasLocalOverride
    ? applyRequiredSections(courses, config.localRequiredSections)
    : courses;
  res.json({
    ...generateCompactSchedules(effectiveCourses),
    requiredSections: hasLocalOverride ? config.localRequiredSections : [],
  });
});

scheduleRouter.get('/', async (req, res) => {
  const semester = String(req.query.semester || 'HK261');
  const [rows] = await pool.execute(
    `SELECT s.id, s.name, s.mode, s.study_days, s.gap_minutes, s.created_at,
       sec.id AS section_id, sec.code AS section_code, sec.instructor,
       c.id AS course_id, c.code AS course_code, c.name AS course_name,
       sm.id AS meeting_id, sm.day_of_week,
       TIME_FORMAT(sm.start_time, '%H:%i') AS start_time,
       TIME_FORMAT(sm.end_time, '%H:%i') AS end_time
     FROM schedules s
     JOIN semesters sem ON sem.id = s.semester_id
     LEFT JOIN schedule_sections ss ON ss.schedule_id = s.id
     LEFT JOIN sections sec ON sec.id = ss.section_id
     LEFT JOIN courses c ON c.id = sec.course_id
     LEFT JOIN section_meetings sm ON sm.section_id = sec.id
     WHERE s.user_id = ? AND sem.name = ?
     ORDER BY s.created_at DESC, c.code, sm.day_of_week, sm.start_time`,
    [req.user.id, semester],
  );

  const schedules = new Map();
  const sections = new Map();
  for (const row of rows) {
    if (!schedules.has(row.id)) {
      schedules.set(row.id, {
        id: row.id,
        name: row.name,
        mode: row.mode,
        studyDays: row.study_days,
        gapMinutes: row.gap_minutes,
        createdAt: row.created_at,
        sections: [],
      });
    }
    const sectionKey = `${row.id}:${row.section_id}`;
    if (row.section_id && !sections.has(sectionKey)) {
      const section = {
        id: row.section_id,
        code: row.section_code,
        instructor: row.instructor || '',
        courseId: row.course_id,
        courseCode: row.course_code,
        courseName: row.course_name,
        meetings: [],
      };
      sections.set(sectionKey, section);
      schedules.get(row.id).sections.push(section);
    }
    if (row.meeting_id) {
      sections.get(sectionKey).meetings.push({
        id: row.meeting_id,
        dayOfWeek: row.day_of_week,
        startTime: row.start_time,
        endTime: row.end_time,
      });
    }
  }
  res.json({ schedules: [...schedules.values()] });
});

scheduleRouter.post('/', async (req, res) => {
  const input = parseOrThrow(scheduleSchema, req.body);
  const uniqueSectionIds = [...new Set(input.sectionIds)];

  const scheduleId = await withTransaction(async (connection) => {
    const sections = await fetchSectionsForSchedule(
      req.user.id,
      input.semester,
      uniqueSectionIds,
      connection,
    );
    if (sections.length !== uniqueSectionIds.length) {
      const error = new Error('Một hoặc nhiều lớp không hợp lệ.');
      error.status = 400;
      throw error;
    }
    if (new Set(sections.map((section) => section.courseId)).size !== sections.length) {
      const error = new Error('Mỗi môn chỉ được chọn một lớp.');
      error.status = 400;
      throw error;
    }
    const selectedSections = [];
    for (const section of sections) {
      if (sectionConflicts(section, selectedSections)) {
        const error = new Error('Không thể lưu lịch có các lớp trùng giờ.');
        error.status = 400;
        throw error;
      }
      selectedSections.push(section);
    }
    const metrics = getScheduleMetrics(sections);
    const semester = await getOrCreateSemester(req.user.id, input.semester, connection);
    const [result] = await connection.execute(
      `INSERT INTO schedules (user_id, semester_id, name, mode, study_days, gap_minutes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, semester.id, input.name, input.mode, metrics.studyDays, metrics.gapMinutes],
    );
    for (const sectionId of uniqueSectionIds) {
      await connection.execute(
        'INSERT INTO schedule_sections (schedule_id, section_id) VALUES (?, ?)',
        [result.insertId, sectionId],
      );
    }
    return result.insertId;
  });

  res.status(201).json({ id: scheduleId });
});

scheduleRouter.delete('/:scheduleId', async (req, res) => {
  const [result] = await pool.execute(
    'DELETE FROM schedules WHERE id = ? AND user_id = ?',
    [Number(req.params.scheduleId), req.user.id],
  );
  if (!result.affectedRows) return res.status(404).json({ message: 'Không tìm thấy lịch.' });
  res.status(204).end();
});
