import { useEffect, useState } from 'react';
import { BookOpen, CalendarRange, LogOut, Menu, X } from 'lucide-react';
import { api } from './api.js';
import AuthScreen from './components/AuthScreen.jsx';
import Brand from './components/Brand.jsx';
import CourseDialog from './components/CourseDialog.jsx';
import CourseList from './components/CourseList.jsx';
import ConfirmDialog from './components/ConfirmDialog.jsx';
import HcmutImportDialog from './components/HcmutImportDialog.jsx';
import Planner from './components/Planner.jsx';
import SavedSchedules from './components/SavedSchedules.jsx';

const SEMESTER = 'HK261';

export default function App() {
  const [user, setUser] = useState(undefined);
  const [courses, setCourses] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [activePage, setActivePage] = useState('courses');
  const [dialog, setDialog] = useState({ open: false, course: null });
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [schedulesLoading, setSchedulesLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [pendingDelete, setPendingDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [importOpen, setImportOpen] = useState(false);

  useEffect(() => {
    api.me()
      .then(({ user: currentUser }) => {
        setUser(currentUser);
        return loadCourses();
      })
      .catch(() => setUser(null));
  }, []);

  async function loadCourses() {
    const result = await api.getCourses(SEMESTER);
    setCourses(result.courses);
    return result.courses;
  }

  async function authenticate(mode, form) {
    const result = mode === 'login'
      ? await api.login({ email: form.email, password: form.password })
      : await api.signup(form);
    setUser(result.user);
    await loadCourses();
  }

  async function logout() {
    await api.logout();
    setUser(null);
    setCourses([]);
    setSchedules([]);
  }

  async function saveCourse(input) {
    if (dialog.course) await api.updateCourse(dialog.course.id, input);
    else await api.createCourse(input);
    await loadCourses();
  }

  async function importCourses(input) {
    const result = await api.importCourses(input);
    setCourses(result.courses);
    return result.summary;
  }

  function requestDelete(type, item) {
    setDeleteError('');
    setPendingDelete({ type, item });
  }

  function closeDeleteDialog() {
    if (deleteLoading) return;
    setPendingDelete(null);
    setDeleteError('');
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      if (pendingDelete.type === 'course') {
        await api.deleteCourse(pendingDelete.item.id);
        await loadCourses();
      } else {
        await api.deleteSchedule(pendingDelete.item.id);
        setSchedules((current) => current.filter((item) => item.id !== pendingDelete.item.id));
      }
      setPendingDelete(null);
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setDeleteLoading(false);
    }
  }

  async function openPage(page) {
    setActivePage(page);
    setMobileNavOpen(false);
    setGlobalError('');
    if (page === 'saved') {
      setSchedulesLoading(true);
      try {
        const result = await api.getSchedules(SEMESTER);
        setSchedules(result.schedules);
      } catch (error) {
        setGlobalError(error.message);
      } finally {
        setSchedulesLoading(false);
      }
    }
  }

  async function saveSchedule(input) {
    await api.saveSchedule({ ...input, semester: SEMESTER });
  }

  if (user === undefined) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#f6f7f9]">
        <div className="flex items-center gap-3 text-sm font-medium text-slate-600"><span className="size-4 animate-spin rounded-full border-2 border-slate-300 border-t-[#1557b0]" /> Đang mở Lịch Gọn…</div>
      </div>
    );
  }

  if (!user) return <AuthScreen onAuthenticate={authenticate} />;

  const navItems = [
    { id: 'courses', label: 'Môn học', icon: BookOpen },
    { id: 'planner', label: 'Xếp lịch', icon: CalendarRange },
    { id: 'saved', label: 'Lịch đã lưu', icon: CalendarRange },
  ];

  return (
    <div className="min-h-screen bg-[#f5f6f8] text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-8 px-4 sm:px-6">
          <Brand />

          <nav className="hidden h-full items-center gap-1 md:flex" aria-label="Điều hướng chính">
            {navItems.map(({ id, label }) => (
              <button key={id} className={`top-nav-item ${activePage === id ? 'active' : ''}`} onClick={() => openPage(id)}>{label}</button>
            ))}
          </nav>

          <div className="ml-auto hidden items-center gap-3 sm:flex">
            <div className="text-right">
              <p className="max-w-44 truncate text-sm font-semibold text-slate-900">{user.fullName}</p>
              <p className="max-w-44 truncate text-xs text-slate-500">{user.email}</p>
            </div>
            <button className="icon-button" onClick={logout} aria-label="Đăng xuất" title="Đăng xuất"><LogOut size={18} /></button>
          </div>

          <button className="icon-button ml-auto md:hidden" onClick={() => setMobileNavOpen(!mobileNavOpen)} aria-label="Mở menu">
            {mobileNavOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {mobileNavOpen && (
          <div className="border-t border-slate-200 bg-white p-3 md:hidden">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button key={id} className={`mobile-nav-item ${activePage === id ? 'active' : ''}`} onClick={() => openPage(id)}><Icon size={17} /> {label}</button>
            ))}
            <button className="mobile-nav-item mt-2 border-t border-slate-200 pt-3 text-red-600" onClick={logout}><LogOut size={17} /> Đăng xuất</button>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-[1440px] p-3 sm:p-6 lg:p-8">
        {globalError && (
          <div className="mb-4 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>{globalError}</span>
            <button onClick={() => setGlobalError('')} aria-label="Đóng"><X size={17} /></button>
          </div>
        )}

        {activePage === 'courses' && (
          <CourseList
            courses={courses}
            onAdd={() => setDialog({ open: true, course: null })}
            onImport={() => setImportOpen(true)}
            onEdit={(course) => setDialog({ open: true, course })}
            onDelete={(course) => requestDelete('course', course)}
          />
        )}

        {activePage === 'planner' && (
          <Planner
            courses={courses}
            onAddCourse={() => setDialog({ open: true, course: null })}
            onGenerate={() => api.generateSchedules(SEMESTER)}
            onSave={saveSchedule}
          />
        )}

        {activePage === 'saved' && (
          <SavedSchedules
            schedules={schedules}
            courses={courses}
            loading={schedulesLoading}
            onDelete={(schedule) => requestDelete('schedule', schedule)}
          />
        )}
      </main>

      <CourseDialog
        open={dialog.open}
        course={dialog.course}
        semester={SEMESTER}
        onClose={() => setDialog({ open: false, course: null })}
        onSave={saveCourse}
      />

      <HcmutImportDialog
        open={importOpen}
        courses={courses}
        semester={SEMESTER}
        onClose={() => setImportOpen(false)}
        onImport={importCourses}
      />

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete?.type === 'course' ? 'Xóa môn học?' : 'Xóa lịch đã lưu?'}
        confirmLabel={pendingDelete?.type === 'course' ? 'Xóa môn' : 'Xóa lịch'}
        loading={deleteLoading}
        error={deleteError}
        onCancel={closeDeleteDialog}
        onConfirm={confirmDelete}
      >
        {pendingDelete?.type === 'course' ? (
          <>
            Bạn sắp xóa <strong className="font-semibold text-slate-900">{pendingDelete.item.code} · {pendingDelete.item.name}</strong>.
            <span className="mt-2 block">Tất cả lớp thuộc môn này sẽ bị xóa và những lịch đã lưu có sử dụng chúng cũng sẽ bị ảnh hưởng.</span>
          </>
        ) : (
          <>
            Lịch <strong className="font-semibold text-slate-900">“{pendingDelete?.item.name}”</strong> sẽ bị xóa khỏi tài khoản của bạn. Hành động này không thể hoàn tác.
          </>
        )}
      </ConfirmDialog>
    </div>
  );
}
