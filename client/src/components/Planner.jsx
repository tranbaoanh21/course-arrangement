import { useMemo, useState } from 'react';
import { AlertCircle, Check, ChevronDown, LoaderCircle, Plus, Save, Sparkles } from 'lucide-react';
import WeekCalendar from './WeekCalendar.jsx';
import { calculateMetrics, formatDuration, formatMeeting, sectionHasConflict } from '../utils/schedule.js';

export default function Planner({ courses, onAddCourse, onGenerate, onSave }) {
  const [mode, setMode] = useState('auto');
  const [suggestions, setSuggestions] = useState([]);
  const [activeSuggestion, setActiveSuggestion] = useState(0);
  const [manualSections, setManualSections] = useState([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');

  const shownSections = mode === 'auto' ? suggestions[activeSuggestion]?.sections || [] : manualSections;
  const metrics = mode === 'auto'
    ? suggestions[activeSuggestion] || { studyDays: 0, gapMinutes: 0 }
    : calculateMetrics(manualSections);

  const selectedByCourse = useMemo(() => new Map(shownSections.map((section) => [section.courseId, section.id])), [shownSections]);

  async function generate() {
    setGenerating(true);
    setNotice('');
    try {
      const result = await onGenerate();
      setSuggestions(result.suggestions);
      setActiveSuggestion(0);
      if (!result.suggestions.length) setNotice('Không tìm thấy tổ hợp nào không bị trùng giờ. Hãy kiểm tra lại các lớp đã nhập.');
      else if (result.truncated) setNotice('Số tổ hợp rất lớn. Đây là ba kết quả tốt nhất trong phạm vi đã kiểm tra.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setGenerating(false);
    }
  }

  function chooseManualSection(course, section) {
    setNotice('');
    const otherSections = manualSections.filter((item) => item.courseId !== course.id);
    if (manualSections.some((item) => item.id === section.id)) {
      setManualSections(otherSections);
      return;
    }
    if (sectionHasConflict(section, otherSections)) {
      const conflict = otherSections.find((selected) => sectionHasConflict(section, [selected]));
      setNotice(`${course.code} · ${section.code} trùng giờ với ${conflict.courseCode} · ${conflict.code}.`);
      return;
    }
    setManualSections([...otherSections, section]);
  }

  async function saveCurrent() {
    if (!shownSections.length) return;
    setSaving(true);
    setNotice('');
    try {
      await onSave({
        name: mode === 'auto' ? `Phương án ${activeSuggestion + 1}` : 'Lịch tự chọn',
        mode: mode.toUpperCase(),
        sectionIds: shownSections.map((section) => section.id),
        studyDays: metrics.studyDays,
        gapMinutes: metrics.gapMinutes,
      });
      setNotice('Đã lưu lịch vào tài khoản của bạn.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="content-panel overflow-hidden">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-5 sm:px-7 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="page-title">Xếp lịch HK261</h1>
          <p className="page-subtitle">Chọn tự động để nhận ba lịch cô đọng, hoặc tự chọn từng lớp.</p>
        </div>
        <div className="segment-control self-start" role="tablist" aria-label="Chế độ xếp lịch">
          <button className={mode === 'auto' ? 'active' : ''} onClick={() => { setMode('auto'); setNotice(''); }}>Tự động xếp</button>
          <button className={mode === 'manual' ? 'active' : ''} onClick={() => { setMode('manual'); setNotice(''); }}>Tự chọn lớp</button>
        </div>
      </div>

      <div className="grid min-h-[730px] lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border-b border-slate-200 bg-slate-50/60 lg:border-b-0 lg:border-r">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">Môn và lớp</h2>
              <p className="mt-0.5 text-xs text-slate-500">{courses.length} môn trong học kỳ</p>
            </div>
            <button className="icon-button" onClick={onAddCourse} aria-label="Thêm môn"><Plus size={18} /></button>
          </div>

          <div className="max-h-[420px] overflow-y-auto p-3 lg:max-h-[590px]">
            {courses.length === 0 ? (
              <div className="px-3 py-10 text-center">
                <p className="text-sm font-medium text-slate-700">Chưa có dữ liệu lớp</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">Thêm môn và các lớp có thể đăng ký để bắt đầu.</p>
                <button className="secondary-button mx-auto mt-4" onClick={onAddCourse}><Plus size={15} /> Thêm môn</button>
              </div>
            ) : courses.map((course) => (
              <details key={course.id} className="course-picker" open>
                <summary>
                  <span><strong>{course.code}</strong><small>{course.name}</small></span>
                  <ChevronDown size={16} />
                </summary>
                <div className="space-y-1.5 px-2 pb-2">
                  {course.sections.map((section) => {
                    const selected = selectedByCourse.get(course.id) === section.id;
                    return (
                      <button
                        key={section.id}
                        className={`section-choice ${selected ? 'selected' : ''} ${mode === 'auto' ? 'cursor-default' : ''}`}
                        onClick={() => mode === 'manual' && chooseManualSection(course, section)}
                        disabled={mode === 'auto'}
                      >
                        <span className="selection-mark">{selected && <Check size={13} />}</span>
                        <span className="min-w-0 flex-1">
                          <strong>{section.code}</strong>
                          <small>{section.meetings.map(formatMeeting).join(' · ')}</small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>

          <div className="border-t border-slate-200 p-4">
            {mode === 'auto' ? (
              <button className="primary-button w-full" disabled={!courses.length || generating} onClick={generate}>
                {generating ? <LoaderCircle className="animate-spin" size={17} /> : <Sparkles size={17} />}
                {generating ? 'Đang xếp lịch…' : 'Tạo 3 phương án'}
              </button>
            ) : (
              <p className="text-xs leading-5 text-slate-500">Nhấn vào một lớp để thêm vào lịch. Chọn lớp khác của cùng môn để thay thế.</p>
            )}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex min-h-[68px] flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            {mode === 'auto' && suggestions.length > 0 ? (
              <div className="option-tabs">
                {suggestions.map((suggestion, index) => (
                  <button key={suggestion.rank} className={activeSuggestion === index ? 'active' : ''} onClick={() => setActiveSuggestion(index)}>
                    Phương án {index + 1}
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-slate-900">{mode === 'manual' ? 'Lịch tự chọn' : 'Thời khóa biểu'}</p>
                <p className="mt-0.5 text-xs text-slate-500">07:00–18:00 · Thứ 2–Thứ 7</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              {shownSections.length > 0 && (
                <p className="whitespace-nowrap text-xs text-slate-500">
                  <strong className="font-semibold text-slate-800">{metrics.studyDays} ngày học</strong> · {formatDuration(metrics.gapMinutes)}
                </p>
              )}
              <button className="secondary-button" disabled={!shownSections.length || saving} onClick={saveCurrent}>
                <Save size={15} /> {saving ? 'Đang lưu…' : 'Lưu lịch'}
              </button>
            </div>
          </div>

          {notice && (
            <div className={`mx-4 mt-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm sm:mx-5 ${notice.startsWith('Đã lưu') ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
              {notice.startsWith('Đã lưu') ? <Check size={17} /> : <AlertCircle size={17} />}
              <span>{notice}</span>
            </div>
          )}

          {!shownSections.length && !notice && (
            <div className="mx-4 mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 sm:mx-5">
              {mode === 'auto' ? 'Nhấn “Tạo 3 phương án” để hệ thống chọn lớp và gom lịch vào ít ngày nhất.' : 'Chọn một lớp trong danh sách bên trái để đưa vào lịch.'}
            </div>
          )}

          <div className="p-4 sm:p-5">
            <WeekCalendar sections={shownSections} courses={courses} />
          </div>
        </div>
      </div>
    </section>
  );
}
