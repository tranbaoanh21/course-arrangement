import { useState } from 'react';
import { BookOpen, ChevronDown, ChevronRight, ClipboardPaste, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import { formatMeeting } from '../utils/schedule.js';

export default function CourseList({ courses, onAdd, onImport, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(new Set());
  const [menuCourseId, setMenuCourseId] = useState(null);

  function toggle(courseId) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  }

  return (
    <section className="content-panel">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
        <div>
          <h1 className="page-title">Môn học HK261</h1>
          <p className="page-subtitle">Thêm tất cả lớp có thể đăng ký trước khi tạo lịch.</p>
        </div>
        <div className="flex flex-wrap gap-2 self-start">
          <button className="secondary-button" onClick={onImport}><ClipboardPaste size={16} /> Import từ HCMUT</button>
          <button className="primary-button" onClick={onAdd}><Plus size={17} /> Thêm thủ công</button>
        </div>
      </div>

      {courses.length === 0 ? (
        <div className="grid min-h-[430px] place-items-center p-8 text-center">
          <div className="max-w-sm">
            <span className="mx-auto grid size-12 place-items-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500"><BookOpen size={22} /></span>
            <h2 className="mt-4 text-lg font-semibold text-slate-950">Chưa có môn học nào</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Paste nội dung trang đăng ký HCMUT để lấy lớp tự động, hoặc nhập môn thủ công.</p>
            <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
              <button className="primary-button" onClick={onImport}><ClipboardPaste size={16} /> Import từ HCMUT</button>
              <button className="secondary-button" onClick={onAdd}><Plus size={17} /> Thêm thủ công</button>
            </div>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-slate-200">
          {courses.map((course) => {
            const isExpanded = expanded.has(course.id);
            return (
              <article key={course.id}>
                <div className="flex items-center gap-3 px-5 py-4 sm:px-7">
                  <button className="grid size-8 place-items-center rounded-md text-slate-500 hover:bg-slate-100" onClick={() => toggle(course.id)} aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}>
                    {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="font-mono text-sm font-semibold text-[#1557b0]">{course.code}</span>
                      <h2 className="truncate font-semibold text-slate-950">{course.name}</h2>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{course.sections.length} lớp có thể chọn</p>
                  </div>
                  <div className="relative">
                    <button className="icon-button" onClick={() => setMenuCourseId(menuCourseId === course.id ? null : course.id)} aria-label="Thao tác với môn"><MoreHorizontal size={19} /></button>
                    {menuCourseId === course.id && (
                      <div className="absolute right-0 top-10 z-20 w-40 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
                        <button className="menu-item" onClick={() => { onEdit(course); setMenuCourseId(null); }}><Pencil size={15} /> Chỉnh sửa</button>
                        <button className="menu-item text-red-600 hover:bg-red-50" onClick={() => { onDelete(course); setMenuCourseId(null); }}><Trash2 size={15} /> Xóa môn</button>
                      </div>
                    )}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3 sm:pl-[76px] sm:pr-7">
                    <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                      {course.sections.map((section) => (
                        <div key={section.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[90px_1fr_1fr] sm:items-center">
                          <span className="text-sm font-semibold text-slate-900">{section.code}</span>
                          <div className="space-y-1 text-sm text-slate-600">
                            {section.meetings.map((meeting) => <p key={meeting.id}>{formatMeeting(meeting)}</p>)}
                          </div>
                          <p className="text-sm text-slate-500 sm:text-right">{section.instructor || 'Chưa có giảng viên'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
