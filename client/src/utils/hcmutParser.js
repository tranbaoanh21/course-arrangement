import { periodToEndTime, periodToStartTime } from './schedule.js';

const COURSE_CODE_PATTERN = '[A-Z]{2,4}\\d{3,4}';
const SECTION_CODE_PATTERN = /^[A-Z]{1,4}\d{2}(?:_[A-Z]{1,4}\d{2})?$/;

function normalizeLine(value) {
  return String(value || '')
    .normalize('NFC')
    .replace(/\u00a0/g, ' ')
    .replace(/\uFEFF/g, '')
    .trim();
}

function splitFields(line) {
  return String(line).split('\t').map(normalizeLine);
}

function parseSectionHeader(line) {
  const fields = splitFields(line);
  if (!SECTION_CODE_PATTERN.test(fields[0] || '')) return null;
  const capacityMatch = (fields[1] || '').match(/^(\d+)\s*\/\s*(\d+)$/);
  if (!capacityMatch) return null;

  const registeredCount = Number(capacityMatch[1]);
  const capacity = Number(capacityMatch[2]);
  const instructor = [fields[4], fields[6]]
    .map((value) => String(value || '').replace(/^"|"$/g, '').trim())
    .find((value) => value && value !== 'Chưa/Đang phân công') || '';

  return {
    code: fields[0].toUpperCase(),
    registeredCount,
    capacity,
    isFull: capacity > 0 && registeredCount >= capacity,
    language: fields[2] || '',
    lectureGroup: fields[3] || '',
    practiceGroup: fields[5] || '',
    instructor,
    campuses: [],
    meetings: [],
  };
}

function parseMeeting(line) {
  const fields = splitFields(line);
  const dayMatch = (fields[0] || '').match(/^Thứ\s*([2-7])$/i);
  if (!dayMatch || !fields[1]) return null;

  const periods = (fields[1].match(/\d+/g) || []).map(Number);
  if (!periods.length) return null;
  const uniquePeriods = [...new Set(periods)];
  const isContinuous = uniquePeriods.every(
    (period, index) => index === 0 || period === uniquePeriods[index - 1] + 1,
  );
  const startPeriod = uniquePeriods[0];
  const endPeriod = uniquePeriods.at(-1);
  const campus = /^\d+$/.test(fields[3] || '') ? Number(fields[3]) : null;

  return {
    meeting: {
      dayOfWeek: Number(dayMatch[1]),
      startPeriod,
      endPeriod,
      startTime: periodToStartTime(startPeriod),
      endTime: periodToEndTime(endPeriod),
      room: fields[2] || '',
      campus,
    },
    isContinuous,
    isSupported: startPeriod >= 2 && endPeriod <= 12,
  };
}

function parseSections(lines, startIndex, endIndex, warnings, courseCode) {
  const sections = [];
  let currentSection = null;

  for (let index = startIndex; index < endIndex; index += 1) {
    const sectionHeader = parseSectionHeader(lines[index]);
    if (sectionHeader) {
      if (currentSection) sections.push(currentSection);
      currentSection = sectionHeader;
      continue;
    }

    if (!currentSection) continue;
    const parsedMeeting = parseMeeting(lines[index]);
    if (!parsedMeeting) continue;
    if (!parsedMeeting.isContinuous) {
      warnings.push(`${courseCode} · ${currentSection.code}: dãy tiết không liên tục nên đã bỏ qua buổi học.`);
      continue;
    }
    if (!parsedMeeting.isSupported) {
      warnings.push(`${courseCode} · ${currentSection.code}: chỉ hỗ trợ tiết 2–12 nên đã bỏ qua buổi học.`);
      continue;
    }
    currentSection.meetings.push(parsedMeeting.meeting);
    if (parsedMeeting.meeting.campus && !currentSection.campuses.includes(parsedMeeting.meeting.campus)) {
      currentSection.campuses.push(parsedMeeting.meeting.campus);
    }
  }
  if (currentSection) sections.push(currentSection);

  return sections.filter((section) => {
    if (section.meetings.length) return true;
    warnings.push(`${courseCode} · ${section.code}: chưa có lịch học nên không thể import.`);
    return false;
  });
}

function parseQueryCourse(lines, startIndex, endIndex, warnings) {
  const courseHeaderPattern = new RegExp(`^(${COURSE_CODE_PATTERN})\\s*-\\s*(.+)$`, 'i');
  let headerIndex = -1;
  let headerMatch = null;

  for (let index = startIndex; index < endIndex; index += 1) {
    const match = normalizeLine(lines[index]).match(courseHeaderPattern);
    if (match) {
      headerIndex = index;
      headerMatch = match;
      break;
    }
  }
  if (!headerMatch) return null;

  const code = headerMatch[1].toUpperCase();
  return {
    code,
    name: headerMatch[2].trim(),
    sections: parseSections(lines, headerIndex + 1, endIndex, warnings, code),
  };
}

function parseRegisteredCourseHeader(line) {
  const pattern = new RegExp(`^\\d+(${COURSE_CODE_PATTERN})\\s*-\\s*(.+?)(\\d+(?:\\.\\d+)?)$`, 'i');
  const match = normalizeLine(line).match(pattern);
  if (!match) return null;
  return {
    code: match[1].toUpperCase(),
    name: match[2].trim(),
    credits: Number(match[3]),
  };
}

function parseRegisteredCourses(lines, startIndex, endIndex, warnings) {
  const headers = [];
  for (let index = startIndex; index < endIndex; index += 1) {
    const course = parseRegisteredCourseHeader(lines[index]);
    if (course) headers.push({ index, course });
  }

  return headers.flatMap(({ index, course }, headerOffset) => {
    const nextIndex = headers[headerOffset + 1]?.index || endIndex;
    const sections = parseSections(lines, index + 1, nextIndex, warnings, course.code);
    if (!sections.length) return [];
    return [{ ...course, sections }];
  });
}

function mode(values) {
  const counts = new Map();
  for (const value of values.filter((item) => item !== '' && item != null)) {
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? '';
}

export function parseHcmutRegistration(rawText) {
  const normalizedText = String(rawText || '')
    .normalize('NFC')
    .replace(/\uFEFF/g, '')
    .replace(/\r\n?/g, '\n');
  const lines = normalizedText.split('\n');
  const normalizedLines = lines.map(normalizeLine);
  const warnings = [];

  const queryMarker = normalizedLines.findIndex((line) => line === 'Chọn môn học đăng ký');
  const slipMarker = normalizedLines.findIndex((line) => line === 'Phiếu đăng ký');
  const registeredMarker = normalizedLines.findIndex((line) => line === 'Danh sách đã đăng ký');
  const registeredEnd = normalizedLines.findIndex((line) => line.startsWith('Tổng số tín chỉ đăng ký'));

  if (queryMarker < 0 || slipMarker < 0 || slipMarker <= queryMarker) {
    throw new Error('Không tìm thấy khối “Chọn môn học đăng ký”. Hãy copy toàn bộ trang sau khi query môn.');
  }

  const queriedCourse = parseQueryCourse(lines, queryMarker + 1, slipMarker, warnings);
  if (!queriedCourse) {
    throw new Error('Không nhận diện được môn đang query trong nội dung đã paste.');
  }
  if (!queriedCourse.sections.length) {
    throw new Error(`${queriedCourse.code} không có lớp hợp lệ trong khoảng tiết 2–12.`);
  }

  const registeredCourses = registeredMarker >= 0
    ? parseRegisteredCourses(
      lines,
      registeredMarker + 1,
      registeredEnd > registeredMarker ? registeredEnd : lines.length,
      warnings,
    )
    : [];

  const registeredKeys = new Set(
    registeredCourses.flatMap((course) => course.sections.map((section) => `${course.code}:${section.code}`)),
  );
  queriedCourse.sections = queriedCourse.sections.map((section) => ({
    ...section,
    alreadyRegistered: registeredKeys.has(`${queriedCourse.code}:${section.code}`),
  }));

  const registeredQuerySection = registeredCourses
    .find((course) => course.code === queriedCourse.code)
    ?.sections[0];
  const allRegisteredSections = registeredCourses.flatMap((course) => course.sections);
  const suggestedLanguage = registeredQuerySection?.language || mode(allRegisteredSections.map((section) => section.language));
  const suggestedCampus = registeredQuerySection?.campuses[0]
    || mode(allRegisteredSections.flatMap((section) => section.campuses));
  const semesterMatch = normalizedText.match(/\b(HK\d+)(?:_D\d+)?\b/i);

  return {
    semester: semesterMatch?.[1]?.toUpperCase() || 'HK261',
    queriedCourse,
    registeredCourses,
    suggestedLanguage,
    suggestedCampus: suggestedCampus ? Number(suggestedCampus) : '',
    warnings: [...new Set(warnings)],
  };
}

export function isImportableSection(section) {
  return !section.isFull || section.alreadyRegistered;
}
