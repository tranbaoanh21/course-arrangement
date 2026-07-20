import { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { DAYS, endTimeToPeriod, periodToEndTime, periodToStartTime, startTimeToPeriod } from '../utils/schedule.js';

const makeMeeting = () => ({ key: crypto.randomUUID(), dayOfWeek: 2, startPeriod: 2, endPeriod: 3 });
const makeSection = (index = 1) => ({ key: crypto.randomUUID(), code: `L${String(index).padStart(2, '0')}`, instructor: '', meetings: [makeMeeting()] });

function buildInitialCourse(course) {
  if (!course) return { code: '', name: '', sections: [makeSection()] };
  return {
    code: course.code,
    name: course.name,
    sections: course.sections.map((section) => ({
      ...section,
      key: crypto.randomUUID(),
      meetings: section.meetings.map((meeting) => ({
        ...meeting,
        key: crypto.randomUUID(),
        startPeriod: startTimeToPeriod(meeting.startTime),
        endPeriod: endTimeToPeriod(meeting.endTime),
      })),
    })),
  };
}

export default function CourseDialog({ open, course, semester, onClose, onSave }) {
  const [form, setForm] = useState(() => buildInitialCourse(course));
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm(buildInitialCourse(course));
      setError('');
    }
  }, [open, course]);

  if (!open) return null;

  function updateSection(sectionIndex, updates) {
    setForm((current) => ({
      ...current,
      sections: current.sections.map((section, index) => index === sectionIndex ? { ...section, ...updates } : section),
    }));
  }

  function updateMeeting(sectionIndex, meetingIndex, updates) {
    const meetings = form.sections[sectionIndex].meetings.map((meeting, index) =>
      index === meetingIndex ? { ...meeting, ...updates } : meeting,
    );
    updateSection(sectionIndex, { meetings });
  }

  function removeMeeting(sectionIndex, meetingIndex) {
    const meetings = form.sections[sectionIndex].meetings.filter((_, index) => index !== meetingIndex);
    if (meetings.length) updateSection(sectionIndex, { meetings });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    for (const section of form.sections) {
      for (const meeting of section.meetings) {
        if (Number(meeting.startPeriod) > Number(meeting.endPeriod)) {
          setError(`Lớp ${section.code}: tiết kết thúc phải bằng hoặc sau tiết bắt đầu.`);
          return;
        }
        if (Number(meeting.startPeriod) < 2 || Number(meeting.endPeriod) > 12) {
          setError(`Lớp ${section.code}: tiết học phải nằm trong khoảng tiết 2–12.`);
          return;
        }
      }
    }

    setSaving(true);
    try {
      await onSave({
        code: form.code.trim(),
        name: form.name.trim(),
        semester,
        sections: form.sections.map(({ key, ...section }) => ({
          ...section,
          code: section.code.trim(),
          instructor: section.instructor.trim(),
          meetings: section.meetings.map(({ key: meetingKey, startPeriod, endPeriod, startTime, endTime, ...meeting }) => ({
            ...meeting,
            startTime: periodToStartTime(startPeriod),
            endTime: periodToEndTime(endPeriod),
          })),
        })),
      });
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 sm:items-center sm:p-6" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl" role="dialog" aria-modal="true" aria-labelledby="course-dialog-title">
        <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-7 sm:py-5">
          <div>
            <h2 id="course-dialog-title" className="text-xl font-semibold tracking-[-0.02em] text-slate-950">{course ? 'Chỉnh sửa môn học' : 'Thêm môn học'}</h2>
            <p className="mt-1 text-sm text-slate-500">Nhập tất cả lớp bạn có thể đăng ký cho môn này.</p>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Đóng"><X size={19} /></button>
        </header>

        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          <div className="overflow-y-auto px-5 py-5 sm:px-7">
            <div className="grid gap-4 sm:grid-cols-[0.7fr_1.3fr]">
              <label className="form-field">
                <span>Mã môn</span>
                <input required maxLength="30" value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value.toUpperCase() })} placeholder="MT1003" />
              </label>
              <label className="form-field">
                <span>Tên môn</span>
                <input required maxLength="150" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Giải tích" />
              </label>
            </div>

            <div className="mt-7 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-950">Các lớp có thể chọn</h3>
                <p className="mt-0.5 text-xs text-slate-500">Mỗi lớp có thể có nhiều buổi học trong tuần.</p>
              </div>
              <button type="button" className="secondary-button" onClick={() => setForm({ ...form, sections: [...form.sections, makeSection(form.sections.length + 1)] })}>
                <Plus size={15} /> Thêm lớp
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {form.sections.map((section, sectionIndex) => (
                <section key={section.key} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="grid items-end gap-3 sm:grid-cols-[120px_1fr_auto]">
                    <label className="form-field">
                      <span>Mã lớp</span>
                      <input required value={section.code} onChange={(event) => updateSection(sectionIndex, { code: event.target.value.toUpperCase() })} />
                    </label>
                    <label className="form-field">
                      <span>Giảng viên <em>(không bắt buộc)</em></span>
                      <input value={section.instructor} onChange={(event) => updateSection(sectionIndex, { instructor: event.target.value })} placeholder="Tên giảng viên" />
                    </label>
                    <button type="button" className="icon-button mb-0.5 text-slate-500 hover:text-red-600" disabled={form.sections.length === 1} onClick={() => setForm({ ...form, sections: form.sections.filter((_, index) => index !== sectionIndex) })} aria-label={`Xóa lớp ${section.code}`}>
                      <Trash2 size={17} />
                    </button>
                  </div>

                  <div className="mt-4 space-y-2">
                    {section.meetings.map((meeting, meetingIndex) => (
                      <div key={meeting.key} className="rounded-lg border border-slate-200 bg-white p-2.5">
                        <div className="grid items-center gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                        <label className="compact-field">
                          <span className="period-label">Ngày học</span>
                          <select value={meeting.dayOfWeek} onChange={(event) => updateMeeting(sectionIndex, meetingIndex, { dayOfWeek: Number(event.target.value) })}>
                            {DAYS.map((day) => <option key={day.value} value={day.value}>{day.label}</option>)}
                          </select>
                        </label>
                        <label className="compact-field">
                          <span className="period-label">Từ tiết</span>
                          <input required type="number" min="2" max="12" value={meeting.startPeriod} onChange={(event) => updateMeeting(sectionIndex, meetingIndex, { startPeriod: event.target.value === '' ? '' : Number(event.target.value) })} placeholder="2" />
                        </label>
                        <label className="compact-field">
                          <span className="period-label">Đến tiết</span>
                          <input required type="number" min="2" max="12" value={meeting.endPeriod} onChange={(event) => updateMeeting(sectionIndex, meetingIndex, { endPeriod: event.target.value === '' ? '' : Number(event.target.value) })} placeholder="3" />
                        </label>
                        <button type="button" className="icon-button text-slate-400 hover:text-red-600" disabled={section.meetings.length === 1} onClick={() => removeMeeting(sectionIndex, meetingIndex)} aria-label="Xóa buổi học">
                          <X size={16} />
                        </button>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          Tiết {meeting.startPeriod || '—'}–{meeting.endPeriod || '—'}
                          {' · '}
                          <strong className="font-semibold text-slate-700">
                            {meeting.startPeriod ? periodToStartTime(meeting.startPeriod) : '—'}–{meeting.endPeriod ? periodToEndTime(meeting.endPeriod) : '—'}
                          </strong>
                        </p>
                      </div>
                    ))}
                    <button type="button" className="mt-1 inline-flex items-center gap-1.5 text-xs font-semibold text-[#1557b0] hover:text-[#0c3e84]" onClick={() => updateSection(sectionIndex, { meetings: [...section.meetings, makeMeeting()] })}>
                      <Plus size={14} /> Thêm buổi học
                    </button>
                  </div>
                </section>
              ))}
            </div>

            {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
          </div>

          <footer className="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:px-7">
            <button type="button" className="secondary-button" onClick={onClose}>Hủy</button>
            <button className="primary-button" disabled={saving}>{saving ? 'Đang lưu…' : course ? 'Lưu thay đổi' : 'Thêm môn'}</button>
          </footer>
        </form>
      </div>
    </div>
  );
}
