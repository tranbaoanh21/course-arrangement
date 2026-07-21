import { z } from 'zod';

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const periodStartTimePattern = /^(0[7-9]|1[0-7]):00$/;
const periodEndTimePattern = /^(0[7-9]|1[0-7]):50$/;

export const meetingSchema = z.object({
  dayOfWeek: z.coerce.number().int().min(2).max(7),
  startTime: z.string().regex(timePattern),
  endTime: z.string().regex(timePattern),
}).superRefine((meeting, context) => {
  if (meeting.startTime >= meeting.endTime) {
    context.addIssue({ code: 'custom', message: 'Giờ kết thúc phải sau giờ bắt đầu.' });
  }
  if (meeting.startTime < '07:00' || meeting.endTime > '18:00') {
    context.addIssue({ code: 'custom', message: 'Giờ học phải nằm trong khoảng 07:00–18:00.' });
  }
  if (!periodStartTimePattern.test(meeting.startTime) || !periodEndTimePattern.test(meeting.endTime)) {
    context.addIssue({ code: 'custom', message: 'Giờ học phải tương ứng với tiết 2–12.' });
  }
});

const sectionSchema = z.object({
  code: z.string().trim().min(1).max(30).transform((value) => value.toUpperCase()),
  instructor: z.string().trim().max(120).optional().default(''),
  meetings: z.array(meetingSchema).min(1).max(6),
});

const courseFields = {
  code: z.string().trim().min(2).max(30).transform((value) => value.toUpperCase()),
  name: z.string().trim().min(2).max(150),
  sections: z.array(sectionSchema).min(1).max(30),
};

function requireUniqueSectionCodes(course, context) {
  const codes = course.sections.map((section) => section.code);
  if (new Set(codes).size !== codes.length) {
    context.addIssue({ code: 'custom', message: `${course.code}: mã lớp không được trùng nhau.` });
  }
}

const importedCourseSchema = z.object(courseFields).superRefine(requireUniqueSectionCodes);

export const courseSchema = z.object({
  ...courseFields,
  semester: z.string().trim().min(2).max(40).default('HK261'),
}).superRefine(requireUniqueSectionCodes);

export const courseImportSchema = z.object({
  semester: z.string().trim().min(2).max(40).default('HK261'),
  queriedCourse: importedCourseSchema,
  registeredCourses: z.array(importedCourseSchema).max(30).optional().default([]),
}).superRefine((input, context) => {
  const codes = [input.queriedCourse.code, ...input.registeredCourses.map((course) => course.code)];
  if (new Set(codes).size !== codes.length) {
    context.addIssue({ code: 'custom', message: 'Danh sách import có mã môn trùng nhau.' });
  }
});

export const credentialsSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(190),
  password: z.string().min(8).max(72),
});

export const signupSchema = credentialsSchema.extend({
  fullName: z.string().trim().min(2).max(100),
});

export const scheduleSchema = z.object({
  name: z.string().trim().min(2).max(100),
  semester: z.string().trim().min(2).max(40).default('HK261'),
  mode: z.enum(['AUTO', 'MANUAL']),
  sectionIds: z.array(z.coerce.number().int().positive()).min(1).max(30),
});

export function parseOrThrow(schema, value) {
  const result = schema.safeParse(value);
  if (!result.success) {
    const error = new Error(result.error.issues[0]?.message || 'Dữ liệu không hợp lệ.');
    error.status = 400;
    throw error;
  }
  return result.data;
}
