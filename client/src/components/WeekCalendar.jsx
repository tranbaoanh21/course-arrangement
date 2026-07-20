import { DAYS, COURSE_COLORS, timeToMinutes } from '../utils/schedule.js';

const START_MINUTES = 7 * 60;
const END_MINUTES = 18 * 60;
const HOURS = Array.from({ length: 12 }, (_, index) => 7 + index);

export default function WeekCalendar({ sections = [], courses = [] }) {
  const colorByCourse = new Map(courses.map((course, index) => [course.id, COURSE_COLORS[index % COURSE_COLORS.length]]));

  return (
    <div className="calendar-scroll">
      <div className="calendar-shell">
        <div className="calendar-corner" />
        {DAYS.map((day) => <div key={day.value} className="calendar-day-heading"><span>{day.short}</span><small>{day.label}</small></div>)}

        <div className="calendar-time-axis">
          {HOURS.map((hour) => <span key={hour} style={{ top: `${(hour * 60 - START_MINUTES)}px` }}>{String(hour).padStart(2, '0')}:00</span>)}
        </div>

        {DAYS.map((day) => {
          const dayEvents = sections.flatMap((section) =>
            section.meetings
              .filter((meeting) => Number(meeting.dayOfWeek) === day.value)
              .map((meeting) => ({ section, meeting })),
          );
          return (
            <div key={day.value} className="calendar-day-column">
              {HOURS.slice(0, -1).map((hour) => <div key={hour} className="calendar-hour-line" style={{ top: `${(hour - 7) * 60}px` }} />)}
              {dayEvents.map(({ section, meeting }) => {
                const top = timeToMinutes(meeting.startTime) - START_MINUTES;
                const height = timeToMinutes(meeting.endTime) - timeToMinutes(meeting.startTime);
                const color = colorByCourse.get(section.courseId) || COURSE_COLORS[0];
                return (
                  <div
                    key={`${section.id}-${meeting.id || `${meeting.dayOfWeek}-${meeting.startTime}`}`}
                    className="calendar-event"
                    style={{ top: `${top}px`, height: `${height}px`, background: color.bg, borderColor: color.border, color: color.text }}
                    title={`${section.courseCode} · ${section.courseName}\n${section.code} · ${meeting.startTime}–${meeting.endTime}`}
                  >
                    <strong>{section.courseCode}</strong>
                    <span>{section.code}</span>
                    {height >= 54 && <small>{meeting.startTime}–{meeting.endTime}</small>}
                  </div>
                );
              })}
            </div>
          );
        })}
        <div className="sr-only">Lịch hiển thị từ {START_MINUTES} đến {END_MINUTES} phút trong ngày.</div>
      </div>
    </div>
  );
}
