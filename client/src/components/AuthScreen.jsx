import { useState } from 'react';
import { ArrowRight, Check } from 'lucide-react';
import Brand from './Brand.jsx';

export default function AuthScreen({ onAuthenticate }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await onAuthenticate(mode, form);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f7f9] p-4 sm:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] max-w-6xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.08)] sm:min-h-[calc(100vh-4rem)] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative hidden overflow-hidden border-r border-slate-200 bg-[#f7f9fc] p-12 lg:flex lg:flex-col">
          <Brand />
          <div className="mt-20 max-w-lg">
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.16em] text-[#1557b0]">Sắp lịch cho HK261</p>
            <h1 className="text-5xl font-semibold leading-[1.08] tracking-[-0.045em] text-slate-950">
              Ít ngày lên trường.<br />Lịch học liền mạch hơn.
            </h1>
            <p className="mt-6 max-w-md text-lg leading-8 text-slate-600">
              Nhập các lớp có thể đăng ký, nhận ba phương án cô đọng và chỉnh lại trực tiếp trên thời khóa biểu.
            </p>
          </div>

          <div className="mt-auto rounded-xl border border-slate-200 bg-white p-5">
            <div className="grid grid-cols-[56px_repeat(3,1fr)] gap-px overflow-hidden rounded-lg border border-slate-200 bg-slate-200 text-xs">
              <div className="bg-slate-50 p-2" />
              {['T2', 'T3', 'T4'].map((day) => <div key={day} className="bg-slate-50 p-2 text-center font-semibold text-slate-500">{day}</div>)}
              <div className="bg-white p-2 text-slate-400">07:00</div>
              <div className="row-span-2 bg-[#dce8ff] p-2 font-semibold text-[#173b72]">MT1003<br /><span className="font-normal">L01</span></div>
              <div className="bg-white p-2" />
              <div className="bg-[#e2f4ea] p-2 font-semibold text-[#245b38]">CO2003</div>
              <div className="bg-white p-2 text-slate-400">09:00</div>
              <div className="bg-white p-2" />
              <div className="bg-[#ffecd5] p-2 font-semibold text-[#764517]">PH1003</div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center px-6 py-12 sm:px-12">
          <div className="w-full max-w-sm">
            <div className="mb-10 lg:hidden"><Brand /></div>
            <h2 className="text-3xl font-semibold tracking-[-0.035em] text-slate-950">
              {mode === 'login' ? 'Chào mừng bạn trở lại' : 'Tạo tài khoản'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {mode === 'login' ? 'Đăng nhập để tiếp tục sắp lịch học.' : 'Lưu các môn và phương án lịch của riêng bạn.'}
            </p>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              {mode === 'signup' && (
                <label className="form-field">
                  <span>Họ và tên</span>
                  <input required autoComplete="name" value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} placeholder="Nguyễn Văn An" />
                </label>
              )}
              <label className="form-field">
                <span>Email</span>
                <input required type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder="ban@example.com" />
              </label>
              <label className="form-field">
                <span>Mật khẩu</span>
                <input required minLength="8" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Tối thiểu 8 ký tự" />
              </label>

              {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700">{error}</p>}

              <button className="primary-button w-full" disabled={submitting}>
                {submitting ? 'Đang xử lý…' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
                {!submitting && <ArrowRight size={17} />}
              </button>
            </form>

            <button className="mt-6 w-full text-center text-sm text-slate-600 hover:text-slate-950" onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setError(''); }}>
              {mode === 'login' ? 'Chưa có tài khoản? Đăng ký' : 'Đã có tài khoản? Đăng nhập'}
            </button>

            <div className="mt-10 flex items-center gap-2 border-t border-slate-200 pt-5 text-xs text-slate-500">
              <Check size={15} className="text-emerald-600" />
              Mật khẩu được mã hóa trước khi lưu.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
