import { Router } from 'express';
import { pool, withTransaction } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { fetchCourses, getOrCreateSemester } from '../repositories/courses.js';
import { courseImportSchema, courseSchema, parseOrThrow } from '../validation.js';

export const courseRouter = Router();
courseRouter.use(authenticate);

courseRouter.get('/', async (req, res) => {
  const semester = String(req.query.semester || 'HK261');
  res.json({ courses: await fetchCourses(req.user.id, semester) });
});

async function insertSections(connection, courseId, sections) {
  for (const section of sections) {
    const [sectionResult] = await connection.execute(
      'INSERT INTO sections (course_id, code, instructor) VALUES (?, ?, ?)',
      [courseId, section.code, section.instructor || null],
    );
    for (const meeting of section.meetings) {
      await connection.execute(
        `INSERT INTO section_meetings (section_id, day_of_week, start_time, end_time)
         VALUES (?, ?, ?, ?)`,
        [sectionResult.insertId, meeting.dayOfWeek, meeting.startTime, meeting.endTime],
      );
    }
  }
}

async function insertCourse(connection, semesterId, course) {
  const [courseResult] = await connection.execute(
    'INSERT INTO courses (semester_id, code, name) VALUES (?, ?, ?)',
    [semesterId, course.code, course.name],
  );
  await insertSections(connection, courseResult.insertId, course.sections);
  return courseResult.insertId;
}

async function replaceCourseSections(connection, courseId, sections) {
  const [existingRows] = await connection.execute(
    'SELECT id, code FROM sections WHERE course_id = ?',
    [courseId],
  );
  const existingByCode = new Map(existingRows.map((row) => [row.code, row.id]));
  const retainedIds = [];

  for (const section of sections) {
    let sectionId = existingByCode.get(section.code);
    if (sectionId) {
      retainedIds.push(sectionId);
      await connection.execute(
        'UPDATE sections SET instructor = ? WHERE id = ? AND course_id = ?',
        [section.instructor || null, sectionId, courseId],
      );
      await connection.execute('DELETE FROM section_meetings WHERE section_id = ?', [sectionId]);
      for (const meeting of section.meetings) {
        await connection.execute(
          'INSERT INTO section_meetings (section_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
          [sectionId, meeting.dayOfWeek, meeting.startTime, meeting.endTime],
        );
      }
    } else {
      const [sectionResult] = await connection.execute(
        'INSERT INTO sections (course_id, code, instructor) VALUES (?, ?, ?)',
        [courseId, section.code, section.instructor || null],
      );
      sectionId = sectionResult.insertId;
      retainedIds.push(sectionId);
      for (const meeting of section.meetings) {
        await connection.execute(
          'INSERT INTO section_meetings (section_id, day_of_week, start_time, end_time) VALUES (?, ?, ?, ?)',
          [sectionId, meeting.dayOfWeek, meeting.startTime, meeting.endTime],
        );
      }
    }
  }

  const removedIds = existingRows
    .map((row) => Number(row.id))
    .filter((id) => !retainedIds.some((retainedId) => Number(retainedId) === id));
  if (removedIds.length) {
    const placeholders = removedIds.map(() => '?').join(',');
    await connection.execute(
      `DELETE FROM sections WHERE course_id = ? AND id IN (${placeholders})`,
      [courseId, ...removedIds],
    );
  }
}

courseRouter.post('/import', async (req, res) => {
  const input = parseOrThrow(courseImportSchema, req.body);

  const summary = await withTransaction(async (connection) => {
    const semester = await getOrCreateSemester(req.user.id, input.semester, connection);
    const [queryRows] = await connection.execute(
      'SELECT id FROM courses WHERE semester_id = ? AND code = ?',
      [semester.id, input.queriedCourse.code],
    );
    let queriedCourseId = queryRows[0]?.id;
    const queriedCourseAction = queriedCourseId ? 'updated' : 'created';

    if (queriedCourseId) {
      await connection.execute(
        'UPDATE courses SET name = ? WHERE id = ? AND semester_id = ?',
        [input.queriedCourse.name, queriedCourseId, semester.id],
      );
      await replaceCourseSections(connection, queriedCourseId, input.queriedCourse.sections);
    } else {
      queriedCourseId = await insertCourse(connection, semester.id, input.queriedCourse);
    }

    const registeredAdded = [];
    const registeredSkipped = [];
    for (const course of input.registeredCourses) {
      const [existingRows] = await connection.execute(
        'SELECT id FROM courses WHERE semester_id = ? AND code = ?',
        [semester.id, course.code],
      );
      if (existingRows.length) {
        registeredSkipped.push(course.code);
        continue;
      }
      await insertCourse(connection, semester.id, course);
      registeredAdded.push(course.code);
    }

    return {
      queriedCourse: input.queriedCourse.code,
      queriedCourseAction,
      importedSections: input.queriedCourse.sections.length,
      registeredAdded,
      registeredSkipped,
    };
  });

  res.json({ summary, courses: await fetchCourses(req.user.id, input.semester) });
});

courseRouter.post('/', async (req, res) => {
  const input = parseOrThrow(courseSchema, req.body);

  await withTransaction(async (connection) => {
    const semester = await getOrCreateSemester(req.user.id, input.semester, connection);
    await insertCourse(connection, semester.id, input);
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
