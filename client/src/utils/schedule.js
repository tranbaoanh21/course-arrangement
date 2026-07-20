export const DAYS = [
  { value: 2, short: 'T2', label: 'Thứ 2' },
  { value: 3, short: 'T3', label: 'Thứ 3' },
  { value: 4, short: 'T4', label: 'Thứ 4' },
  { value: 5, short: 'T5', label: 'Thứ 5' },
  { value: 6, short: 'T6', label: 'Thứ 6' },
  { value: 7, short: 'T7', label: 'Thứ 7' },
];

export const COURSE_COLORS = [
  { bg: '#dce8ff', border: '#7aa2eb', text: '#173b72' },
  { bg: '#e2f4ea', border: '#74b68e', text: '#245b38' },
  { bg: '#ffecd5', border: '#e8a85e', text: '#764517' },
  { bg: '#eee8ff', border: '#a590df', text: '#4b3b79' },
  { bg: '#fde4e7', border: '#dc8791', text: '#7b2e38' },
  { bg: '#dff3f4', border: '#69afb2', text: '#235b5e' },
];

export function timeToMinutes(time) {
  const [hour, minute] = String(time).split(':').map(Number);
  return hour * 60 + minute;
}

export function periodToStartTime(period) {
  return `${String(Number(period) + 5).padStart(2, '0')}:00`;
}

export function periodToEndTime(period) {
  return `${String(Number(period) + 5).padStart(2, '0')}:50`;
}

export function startTimeToPeriod(time) {
  return Number(String(time).slice(0, 2)) - 5;
}

export function endTimeToPeriod(time) {
  return Number(String(time).slice(0, 2)) - 5;
}

export function meetingsOverlap(left, right) {
  return Number(left.dayOfWeek) === Number(right.dayOfWeek)
    && timeToMinutes(left.startTime) < timeToMinutes(right.endTime)
    && timeToMinutes(right.startTime) < timeToMinutes(left.endTime);
}

export function sectionHasConflict(section, selectedSections) {
  return section.meetings.some((meeting) => selectedSections.some((selected) =>
    selected.id !== section.id
    && selected.meetings.some((otherMeeting) => meetingsOverlap(meeting, otherMeeting)),
  ));
}

export function calculateMetrics(sections) {
  const byDay = new Map();
  sections.forEach((section) => {
    section.meetings.forEach((meeting) => {
      const day = Number(meeting.dayOfWeek);
      const meetings = byDay.get(day) || [];
      meetings.push({ start: timeToMinutes(meeting.startTime), end: timeToMinutes(meeting.endTime) });
      byDay.set(day, meetings);
    });
  });
  let gapMinutes = 0;
  byDay.forEach((meetings) => {
    meetings.sort((a, b) => a.start - b.start);
    for (let index = 1; index < meetings.length; index += 1) {
      gapMinutes += Math.max(0, meetings[index].start - meetings[index - 1].end);
    }
  });
  return { studyDays: byDay.size, gapMinutes };
}

export function formatDuration(minutes) {
  if (!minutes) return 'Không có giờ trống';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} phút trống`;
  return `${hours} giờ${rest ? ` ${rest} phút` : ''} trống`;
}

export function formatMeeting(meeting) {
  const day = DAYS.find((item) => item.value === Number(meeting.dayOfWeek));
  const startPeriod = startTimeToPeriod(meeting.startTime);
  const endPeriod = endTimeToPeriod(meeting.endTime);
  return `${day?.label || ''} · Tiết ${startPeriod}–${endPeriod} · ${meeting.startTime}–${meeting.endTime}`;
}
