const DEFAULT_MAX_COMBINATIONS = 250_000;

export function timeToMinutes(value) {
  const [hours, minutes] = String(value).slice(0, 5).split(':').map(Number);
  return hours * 60 + minutes;
}

export function meetingsOverlap(left, right) {
  if (Number(left.dayOfWeek) !== Number(right.dayOfWeek)) return false;
  return (
    timeToMinutes(left.startTime) < timeToMinutes(right.endTime) &&
    timeToMinutes(right.startTime) < timeToMinutes(left.endTime)
  );
}

export function sectionConflicts(section, selectedSections) {
  const selectedMeetings = selectedSections.flatMap((item) => item.meetings);
  return section.meetings.some((meeting) =>
    selectedMeetings.some((selected) => meetingsOverlap(meeting, selected)),
  );
}

export function getScheduleMetrics(sections) {
  const byDay = new Map();

  for (const section of sections) {
    for (const meeting of section.meetings) {
      const day = Number(meeting.dayOfWeek);
      const items = byDay.get(day) || [];
      items.push({
        start: timeToMinutes(meeting.startTime),
        end: timeToMinutes(meeting.endTime),
      });
      byDay.set(day, items);
    }
  }

  let gapMinutes = 0;
  for (const meetings of byDay.values()) {
    meetings.sort((a, b) => a.start - b.start);
    for (let index = 1; index < meetings.length; index += 1) {
      gapMinutes += Math.max(0, meetings[index].start - meetings[index - 1].end);
    }
  }

  return { studyDays: byDay.size, gapMinutes };
}

export function applyRequiredSections(courses, locks = []) {
  const requiredByCourse = new Map(
    locks.map((lock) => {
      const [courseCode, sectionCode] = lock.split(':').map((value) => value?.trim().toUpperCase());
      return [courseCode, sectionCode];
    }).filter(([courseCode, sectionCode]) => courseCode && sectionCode),
  );

  return courses.map((course) => {
    const requiredSectionCode = requiredByCourse.get(course.code.toUpperCase());
    if (!requiredSectionCode) return course;

    const requiredSections = course.sections.filter(
      (section) => section.code.toUpperCase() === requiredSectionCode,
    );
    if (!requiredSections.length) {
      const error = new Error(`Không tìm thấy lớp bắt buộc ${course.code} · ${requiredSectionCode}.`);
      error.status = 400;
      throw error;
    }
    return { ...course, sections: requiredSections };
  });
}

function compareSchedules(left, right) {
  if (left.studyDays !== right.studyDays) return left.studyDays - right.studyDays;
  if (left.gapMinutes !== right.gapMinutes) return left.gapMinutes - right.gapMinutes;
  return left.key.localeCompare(right.key);
}

export function generateCompactSchedules(courses, options = {}) {
  if (!Array.isArray(courses) || courses.length === 0) {
    return { suggestions: [], exploredCombinations: 0, truncated: false };
  }

  if (courses.some((course) => !Array.isArray(course.sections) || course.sections.length === 0)) {
    return { suggestions: [], exploredCombinations: 0, truncated: false };
  }

  const maxSearchNodes = options.maxSearchNodes || options.maxCombinations || DEFAULT_MAX_COMBINATIONS;
  const orderedCourses = [...courses].sort((a, b) => a.sections.length - b.sections.length);
  const candidates = [];
  let exploredCombinations = 0;
  let inspectedNodes = 0;
  let truncated = false;

  function visit(courseIndex, selectedSections) {
    inspectedNodes += 1;
    if (inspectedNodes > maxSearchNodes) {
      truncated = true;
      return;
    }

    if (courseIndex === orderedCourses.length) {
      exploredCombinations += 1;
      const metrics = getScheduleMetrics(selectedSections);
      const normalizedSections = [...selectedSections].sort((a, b) => a.courseCode.localeCompare(b.courseCode));
      candidates.push({
        ...metrics,
        key: normalizedSections.map((section) => section.id).join('-'),
        sections: normalizedSections,
      });
      candidates.sort(compareSchedules);
      if (candidates.length > 3) candidates.pop();
      return;
    }

    for (const section of orderedCourses[courseIndex].sections) {
      if (!sectionConflicts(section, selectedSections)) {
        visit(courseIndex + 1, [...selectedSections, section]);
      }
      if (truncated) return;
    }
  }

  visit(0, []);
  return {
    suggestions: candidates.map(({ key, ...schedule }, index) => ({
      rank: index + 1,
      ...schedule,
    })),
    exploredCombinations,
    inspectedNodes,
    truncated,
  };
}
