import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, ClipboardPaste, LoaderCircle, Lock, ShieldCheck, X } from 'lucide-react';
import { isImportableSection, parseHcmutRegistration } from '../utils/hcmutParser.js';
import { formatMeeting } from '../utils/schedule.js';

function sectionMatches(section, language, campus) {
  const matchesLanguage = !language || section.language === language;
  const matchesCampus = !campus || section.campuses.includes(Number(campus));
  return matchesLanguage && matchesCampus;
}

function importableCodes(parsed, language, campus) {
  return new Set(parsed.queriedCourse.sections
    .filter((section) => isImportableSection(section) && sectionMatches(section, language, campus))
    .map((section) => section.code));
}

function normalizeCourse(course, selectedCodes) {
  return {
    code: course.code,
    name: course.name,
    sections: course.sections
      .filter((section) => !selectedCodes || selectedCodes.has(section.code))
      .map((section) => ({
        code: section.code,
        instructor: section.instructor || '',
        meetings: section.meetings.map(({ dayOfWeek, startTime, endTime }) => ({
          dayOfWeek,
          startTime,
          endTime,
        })),
      })),
  };
}

export default function HcmutImportDialog({ open, courses, semester, onClose, onImport }) {
  const dialogRef = useRef(null);
  const textareaRef = useRef(null);
  const [rawText, setRawText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [language, setLanguage] = useState('');
  const [campus, setCampus] = useState('');
  const [selectedCodes, setSelectedCodes] = useState(new Set());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setRawText('');
    setParsed(null);
    setError('');
    setSaving(false);
    window.setTimeout(() => textareaRef.current?.focus(), 0);
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const previouslyFocused = document.activeElement;

    function handleKeyDown(event) {
      if (event.key === 'Escape' && !saving) onClose();
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll(
        'button:not(:disabled), textarea:not(:disabled), select:not(:disabled), input:not(:disabled)',
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose, saving]);

  const availableLanguages = useMemo(() => {
    if (!parsed) return [];
    return [...new Set(parsed.queriedCourse.sections.map((section) => section.language).filter(Boolean))];
  }, [parsed]);

  const availableCampuses = useMemo(() => {
    if (!parsed) return [];
    return [...new Set(parsed.queriedCourse.sections.flatMap((section) => section.campuses))].sort();
  }, [parsed]);

  const missingRegisteredCourses = useMemo(() => {
    if (!parsed) return [];
    const existingCodes = new Set(courses.map((course) => course.code));
    return parsed.registeredCourses.filter(
      (course) => course.code !== parsed.queriedCourse.code && !existingCodes.has(course.code),
    );
  }, [courses, parsed]);

  if (!open) return null;

  function analyze() {
    setError('');
    try {
      const result = parseHcmutRegistration(rawText);
      const initialLanguage = result.suggestedLanguage || '';
      const initialCampus = result.suggestedCampus || '';
      setParsed(result);
      setLanguage(initialLanguage);
      setCampus(initialCampus);
      setSelectedCodes(importableCodes(result, initialLanguage, initialCampus));
    } catch (parseError) {
      setParsed(null);
      setError(parseError.message);
    }
  }

  function updateFilter(nextLanguage, nextCampus) {
    setLanguage(nextLanguage);
    setCampus(nextCampus);
    setSelectedCodes(importableCodes(parsed, nextLanguage, nextCampus));
  }

  function toggleSection(section) {
    if (!isImportableSection(section)) return;
    setSelectedCodes((current) => {
      const next = new Set(current);
      if (next.has(section.code)) next.delete(section.code);
      else next.add(section.code);
      return next;
    });
  }

  async function submitImport() {
    if (!selectedCodes.size) {
      setError('Hãy chọn ít nhất một lớp để import.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onImport({
        semester,
        queriedCourse: normalizeCourse(parsed.queriedCourse, selectedCodes),
        registeredCourses: missingRegisteredCourses.map((course) => normalizeCourse(course)),
      });
      onClose();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  const matchingSections = parsed?.queriedCourse.sections.filter((section) => sectionMatches(section, language, campus)) || [];
  const excludedFullCount = matchingSections.filter((section) => section.isFull && !section.alreadyRegistered).length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-6"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && !saving && onClose()}
    >
      <section
        ref={dialogRef}
        className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="hcmut-import-title"
      >
        <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4 sm:px-7 sm:py-5">
          <div>
            <h2 id="hcmut-import-title" className="text-xl font-semibold tracking-[-0.02em] text-slate-950">Import từ trang đăng ký HCMUT</h2>
            <p className="mt-1 text-sm text-slate-500">Copy toàn bộ trang sau khi query một môn để lấy các lớp và giờ học.</p>
          </div>
          <button className="icon-button" disabled={saving} onClick={onClose} aria-label="Đóng"><X size={19} /></button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-7">
          {!parsed ? (
            <>
              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 shrink-0 text-[#1557b0]" size={19} />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Nội dung được xử lý ngay trên trình duyệt</p>
                    <p className="mt-1 text-xs leading-5 text-slate-600">Tên, mã số sinh viên và toàn bộ văn bản bạn paste không được gửi lên server. Chỉ môn và lớp bạn xác nhận mới được lưu.</p>
                  </div>
                </div>
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-semibold text-slate-800">Nội dung trang đăng ký môn học</span>
                <textarea
                  ref={textareaRef}
                  className="min-h-64 w-full resize-y rounded-xl border border-slate-300 bg-white p-4 font-mono text-xs leading-5 text-slate-800 placeholder:font-sans placeholder:text-sm placeholder:text-slate-400 hover:border-slate-400 focus:border-[#1557b0]"
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  placeholder="Tại trang đăng ký: query môn → Ctrl+A → Ctrl+C → paste vào đây…"
                />
              </label>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="font-mono text-sm font-semibold text-[#1557b0]">{parsed.queriedCourse.code}</p>
                  <h3 className="mt-1 font-semibold text-slate-950">{parsed.queriedCourse.name}</h3>
                  <p className="mt-1 text-xs text-slate-500">Đọc được {parsed.queriedCourse.sections.length} lớp · đang chọn {selectedCodes.size} lớp</p>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:w-72">
                  <label className="compact-field">
                    <span className="period-label">Ngôn ngữ</span>
                    <select value={language} onChange={(event) => updateFilter(event.target.value, campus)}>
                      <option value="">Tất cả</option>
                      {availableLanguages.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                  <label className="compact-field">
                    <span className="period-label">Cơ sở</span>
                    <select value={campus} onChange={(event) => updateFilter(language, event.target.value)}>
                      <option value="">Tất cả</option>
                      {availableCampuses.map((item) => <option key={item} value={item}>Cơ sở {item}</option>)}
                    </select>
                  </label>
                </div>
              </div>

              {excludedFullCount > 0 && (
                <div className="mt-4 flex gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                  <AlertTriangle className="mt-0.5 shrink-0" size={17} />
                  <p><strong>{excludedFullCount} lớp đã đủ sĩ số</strong> được khóa và không đưa vào thuật toán.</p>
                </div>
              )}

              <div className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
                {matchingSections.map((section) => {
                  const importable = isImportableSection(section);
                  const selected = selectedCodes.has(section.code);
                  return (
                    <button
                      key={section.code}
                      type="button"
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${selected ? 'bg-blue-50/70' : 'bg-white'} ${importable ? 'hover:bg-slate-50' : 'cursor-not-allowed opacity-60'}`}
                      disabled={!importable}
                      onClick={() => toggleSection(section)}
                    >
                      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded border ${selected ? 'border-[#1557b0] bg-[#1557b0] text-white' : 'border-slate-300 bg-white'}`}>
                        {importable ? selected && <Check size={14} /> : <Lock size={12} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-2">
                          <strong className="text-sm text-slate-950">{section.code}</strong>
                          <span className="text-xs text-slate-500">{section.registeredCount}/{section.capacity}</span>
                          {section.isFull && !section.alreadyRegistered && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">Đã đủ</span>}
                          {section.alreadyRegistered && <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">Đã đăng ký</span>}
                        </span>
                        <span className="mt-1 block space-y-0.5 text-xs leading-5 text-slate-600">
                          {section.meetings.map((meeting, index) => <span key={`${meeting.dayOfWeek}-${meeting.startTime}-${index}`} className="block">{formatMeeting(meeting)}{meeting.room ? ` · ${meeting.room}` : ''}</span>)}
                        </span>
                        {(section.instructor || section.language || section.campuses.length > 0) && (
                          <span className="mt-1 block text-[11px] text-slate-400">
                            {[section.instructor, section.language && `Ngôn ngữ ${section.language}`, section.campuses.length && `Cơ sở ${section.campuses.join(', ')}`].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
                {!matchingSections.length && <p className="bg-white px-4 py-8 text-center text-sm text-slate-500">Không có lớp phù hợp với bộ lọc này.</p>}
              </div>

              {missingRegisteredCourses.length > 0 && (
                <div className="mt-5 rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-900">Môn đã đăng ký chưa có trên Lịch Gọn</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Hệ thống cũng sẽ thêm lớp bạn đã đăng ký của các môn này.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {missingRegisteredCourses.map((course) => (
                      <span key={course.code} className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
                        <strong className="font-mono text-[#1557b0]">{course.code}</strong> · {course.sections.map((section) => section.code).join(', ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {parsed.warnings.length > 0 && (
                <details className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
                  <summary className="cursor-pointer font-semibold text-slate-700">{parsed.warnings.length} mục không thể đọc hoàn toàn</summary>
                  <ul className="mt-2 list-disc space-y-1 pl-5">{parsed.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
                </details>
              )}
            </>
          )}

          {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-between sm:px-7">
          <div>{parsed && <button type="button" className="secondary-button w-full sm:w-auto" disabled={saving} onClick={() => { setParsed(null); setError(''); }}>Paste lại</button>}</div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button type="button" className="secondary-button" disabled={saving} onClick={onClose}>Hủy</button>
            {!parsed ? (
              <button type="button" className="primary-button" disabled={!rawText.trim()} onClick={analyze}><ClipboardPaste size={16} /> Phân tích nội dung</button>
            ) : (
              <button type="button" className="primary-button" disabled={saving || !selectedCodes.size} onClick={submitImport}>
                {saving ? <LoaderCircle className="animate-spin" size={16} /> : <Check size={16} />}
                {saving ? 'Đang import…' : `Import ${selectedCodes.size} lớp`}
              </button>
            )}
          </div>
        </footer>
      </section>
    </div>
  );
}
