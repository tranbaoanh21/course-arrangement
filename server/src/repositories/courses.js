import { pool } from '../db.js';

export async function getOrCreateSemester(userId, name = 'HK261', connection = pool) {
  await connection.execute(
    `INSERT INTO semesters (user_id, name)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`,
    [userId, name],
  );

  const [rows] = await connection.execute(
    'SELECT id, name FROM semesters WHERE user_id = ? AND name = ?',
    [userId, name],
  );
  return rows[0];
}

export async function fetchCourses(userId, semesterName = 'HK261', connection = pool) {
  const [rows] = await connection.execute(
    `SELECT
       c.id AS course_id,
       c.code AS course_code,
       c.name AS course_name,
       sec.id AS section_id,
       sec.code AS section_code,
       sec.instructor,
       sm.id AS meeting_id,
       sm.day_of_week,
       TIME_FORMAT(sm.start_time, '%H:%i') AS start_time,
       TIME_FORMAT(sm.end_time, '%H:%i') AS end_time
     FROM semesters sem
     JOIN courses c ON c.semester_id = sem.id
     LEFT JOIN sections sec ON sec.course_id = c.id
     LEFT JOIN section_meetings sm ON sm.section_id = sec.id
     WHERE sem.user_id = ? AND sem.name = ?
     ORDER BY c.created_at, sec.created_at, sm.day_of_week, sm.start_time`,
    [userId, semesterName],
  );

  const courseMap = new Map();
  const sectionMap = new Map();

  for (const row of rows) {
    if (!courseMap.has(row.course_id)) {
      courseMap.set(row.course_id, {
        id: row.course_id,
        code: row.course_code,
        name: row.course_name,
        sections: [],
      });
    }

    if (row.section_id && !sectionMap.has(row.section_id)) {
      const section = {
        id: row.section_id,
        courseId: row.course_id,
        courseCode: row.course_code,
        courseName: row.course_name,
        code: row.section_code,
        instructor: row.instructor || '',
        meetings: [],
      };
      sectionMap.set(row.section_id, section);
      courseMap.get(row.course_id).sections.push(section);
    }

    if (row.meeting_id) {
      sectionMap.get(row.section_id).meetings.push({
        id: row.meeting_id,
        dayOfWeek: row.day_of_week,
        startTime: row.start_time,
        endTime: row.end_time,
      });
    }
  }

  return [...courseMap.values()];
}

export async function fetchSectionsForSchedule(userId, semesterName, sectionIds, connection = pool) {
  if (sectionIds.length === 0) return [];
  const placeholders = sectionIds.map(() => '?').join(',');
  const [rows] = await connection.execute(
    `SELECT sec.id AS section_id, sec.code AS section_code, sec.instructor,
       c.id AS course_id, c.code AS course_code, c.name AS course_name,
       sm.id AS meeting_id, sm.day_of_week,
       TIME_FORMAT(sm.start_time, '%H:%i') AS start_time,
       TIME_FORMAT(sm.end_time, '%H:%i') AS end_time
     FROM sections sec
     JOIN courses c ON c.id = sec.course_id
     JOIN semesters sem ON sem.id = c.semester_id
     LEFT JOIN section_meetings sm ON sm.section_id = sec.id
     WHERE sem.user_id = ? AND sem.name = ? AND sec.id IN (${placeholders})
     ORDER BY sec.id, sm.day_of_week, sm.start_time`,
    [userId, semesterName, ...sectionIds],
  );

  const sectionMap = new Map();
  for (const row of rows) {
    if (!sectionMap.has(row.section_id)) {
      sectionMap.set(row.section_id, {
        id: row.section_id,
        code: row.section_code,
        instructor: row.instructor || '',
        courseId: row.course_id,
        courseCode: row.course_code,
        courseName: row.course_name,
        meetings: [],
      });
    }
    if (row.meeting_id) {
      sectionMap.get(row.section_id).meetings.push({
        id: row.meeting_id,
        dayOfWeek: row.day_of_week,
        startTime: row.start_time,
        endTime: row.end_time,
      });
    }
  }
  return [...sectionMap.values()];
}
