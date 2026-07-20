import { Router } from 'express';
import { pool, withTransaction } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { fetchCourses, getOrCreateSemester } from '../repositories/courses.js';
import { courseSchema, parseOrThrow } from '../validation.js';

export const courseRouter = Router();
courseRouter.use(authenticate);

courseRouter.get('/', async (req, res) => {
  const semester = String(req.query.semester || 'HK261');
  res.json({ courses: await fetchCourses(req.user.id, semester) });
});

courseRouter.post('/', async (req, res) => {
  const input = parseOrThrow(courseSchema, req.body);

  await withTransaction(async (connection) => {
    const semester = await getOrCreateSemester(req.user.id, input.semester, connection);
    const [courseResult] = await connection.execute(
      'INSERT INTO courses (semester_id, code, name) VALUES (?, ?, ?)',
      [semester.id, input.code, input.name],
    );

    for (const section of input.sections) {
      const [sectionResult] = await connection.execute(
        'INSERT INTO sections (course_id, code, instructor) VALUES (?, ?, ?)',
        [courseResult.insertId, section.code, section.instructor || null],
      );
      for (const meeting of section.meetings) {
        await connection.execute(
          `INSERT INTO section_meetings (section_id, day_of_week, start_time, end_time)
           VALUES (?, ?, ?, ?)`,
          [sectionResult.insertId, meeting.dayOfWeek, meeting.startTime, meeting.endTime],
        );
      }
    }
  });

  const courses = await fetchCourses(req.user.id, input.semester);
  res.status(201).json({ course: courses.find((course) => course.code === input.code) });
});

courseRouter.put('/:courseId', async (req, res) => {
  const input = parseOrThrow(courseSchema, req.body);
  const courseId = Number(req.params.courseId);

  await withTransaction(async (connection) => {
    const [owned] = await connection.execute(
      `SELECT c.id FROM courses c
       JOIN semesters sem ON sem.id = c.semester_id
       WHERE c.id = ? AND sem.user_id = ?`,
      [courseId, req.user.id],
    );
    if (!owned.length) {
      const error = new Error('Không tìm thấy môn học.');
      error.status = 404;
      throw error;
    }

    await connection.execute('UPDATE courses SET code = ?, name = ? WHERE id = ?', [input.code, input.name, courseId]);
    await connection.execute('DELETE FROM sections WHERE course_id = ?', [courseId]);

    for (const section of input.sections) {
      const [sectionResult] = await connection.execute(
        'INSERT INTO sections (course_id, code, instructor) VALUES (?, ?, ?)',
        [courseId, section.code, section.instructor || null],
      );
      for (const meeting of section.meetings) {
        await connection.execute(
          'INSERT INTO section_meetings (section_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
          [sectionResult.insertId, meeting.dayOfWeek, meeting.startTime, meeting.endTime],
        );
      }
    }
  });

  const courses = await fetchCourses(req.user.id, input.semester);
  res.json({ course: courses.find((course) => Number(course.id) === courseId) });
});

courseRouter.delete('/:courseId', async (req, res) => {
  const [result] = await pool.execute(
    `DELETE c FROM courses c
     JOIN semesters sem ON sem.id = c.semester_id
     WHERE c.id = ? AND sem.user_id = ?`,
    [Number(req.params.courseId), req.user.id],
  );
  if (!result.affectedRows) return res.status(404).json({ message: 'Không tìm thấy môn học.' });
  res.status(204).end();
});
