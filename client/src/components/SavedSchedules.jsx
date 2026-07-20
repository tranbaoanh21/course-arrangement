import { CalendarDays, Clock3, Trash2 } from 'lucide-react';
import WeekCalendar from './WeekCalendar.jsx';
import { formatDuration } from '../utils/schedule.js';

export default function SavedSchedules({ schedules, courses, loading, onDelete }) {
  return (
    <section className="content-panel">
      <div className="border-b border-slate-200 px-5 py-5 sm:px-7">
        <h1 className="page-title">Lịch đã lưu</h1>
        <p className="page-subtitle">Các phương án bạn muốn giữ lại cho HK261.</p>
      </div>

      {loading ? (
        <div className="p-8 text-sm text-slate-500">Đang tải lịch…</div>
      ) : schedules.length === 0 ? (
        <div className="grid min-h-[390px] place-items-center p-8 text-center">
          <div>
            <span className="mx-auto grid size-12 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500"><CalendarDays size={22} /></span>
            <h2 className="mt-4 text-lg font-semibold text-slate-950">Chưa lưu lịch nào</h2>
            <p className="mt-2 text-sm text-slate-500">Tạo hoặc tự chọn một lịch, sau đó nhấn “Lưu lịch”.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4 bg-slate-50/60 p-4 sm:p-6">
          {schedules.map((schedule) => (
            <details key={schedule.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white" open={schedules.length === 1}>
              <summary className="flex cursor-pointer list-none items-center gap-4 px-4 py-4 sm:px-5">
                <span className="grid size-10 place-items-center rounded-lg bg-blue-50 text-[#1557b0]"><CalendarDays size={19} /></span>
                <span className="min-w-0 flex-1">
                  <strong className="block truncate text-sm font-semibold text-slate-950">{schedule.name}</strong>
                  <small className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span>{schedule.mode === 'AUTO' ? 'Tự động xếp' : 'Tự chọn lớp'}</span>
                    <span>·</span>
                    <span>{schedule.studyDays} ngày học</span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1"><Clock3 size={12} /> {formatDuration(schedule.gapMinutes)}</span>
                  </small>
                </span>
                <button className="icon-button text-slate-400 hover:text-red-600" onClick={(event) => { event.preventDefault(); onDelete(schedule); }} aria-label="Xóa lịch"><Trash2 size={17} /></button>
              </summary>
              <div className="border-t border-slate-200 p-4 sm:p-5">
                <WeekCalendar sections={schedule.sections} courses={courses} />
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
