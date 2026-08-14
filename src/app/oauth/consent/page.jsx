'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  Check,
  ExternalLink,
  KeyRound,
  Link2,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound,
  X,
} from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

const SCOPE_LABELS = {
  openid: ['Xác minh danh tính', 'Cho phép ứng dụng nhận mã định danh tài khoản của bạn.'],
  email: ['Địa chỉ email', 'Cho phép ứng dụng xem địa chỉ email đã xác minh.'],
  profile: ['Hồ sơ cơ bản', 'Cho phép ứng dụng xem tên và ảnh đại diện của bạn.'],
  phone: ['Số điện thoại', 'Cho phép ứng dụng xem số điện thoại trong tài khoản.'],
};

export default function OAuthConsentPage() {
  return (
    <Suspense fallback={<ConsentLoading />}>
      <OAuthConsentContent />
    </Suspense>
  );
}

function OAuthConsentContent() {
  const searchParams = useSearchParams();
  const authorizationId = searchParams.get('authorization_id')?.trim() || '';
  const supabase = useMemo(() => createClient(), []);
  const [status, setStatus] = useState('loading');
  const [details, setDetails] = useState(null);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadAuthorization = useCallback(async () => {
    if (!authorizationId) {
      setError('Yêu cầu ủy quyền không có authorization_id.');
      setStatus('error');
      return;
    }

    setError('');
    setStatus('loading');
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setStatus('signin');
      return;
    }

    const { data, error: authorizationError } =
      await supabase.auth.oauth.getAuthorizationDetails(authorizationId);

    if (authorizationError || !data) {
      setError(authorizationError?.message || 'Yêu cầu ủy quyền không hợp lệ hoặc đã hết hạn.');
      setStatus('error');
      return;
    }

    if (!('authorization_id' in data)) {
      window.location.replace(data.redirect_url);
      return;
    }

    setDetails(data);
    setStatus('consent');
  }, [authorizationId, supabase]);

  useEffect(() => {
    loadAuthorization();
  }, [loadAuthorization]);

  async function signIn(event) {
    event.preventDefault();
    setSubmitting(true);
    setError('');
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    await loadAuthorization();
  }

  async function decide(action) {
    setSubmitting(true);
    setError('');
    const method = action === 'approve' ? 'approveAuthorization' : 'denyAuthorization';
    const { data, error: decisionError } = await supabase.auth.oauth[method](authorizationId, {
      skipBrowserRedirect: true,
    });

    if (decisionError || !data?.redirect_url) {
      setError(decisionError?.message || 'Không thể xử lý lựa chọn. Vui lòng thử lại.');
      setSubmitting(false);
      return;
    }
    window.location.replace(data.redirect_url);
  }

  const scopes = details?.scope?.split(/\s+/).filter(Boolean) || [];

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f4f8ff] px-5 py-10 text-slate-900">
      <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-cyan-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-blue-400/25 blur-3xl" />

      <section className="relative mx-auto flex min-h-[calc(100vh-5rem)] max-w-xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-[2rem] border border-white/80 bg-white/90 shadow-[0_30px_90px_-35px_rgba(15,64,140,0.45)] backdrop-blur-xl">
          <div className="border-b border-slate-100 bg-gradient-to-br from-blue-600 to-cyan-400 px-7 py-7 text-white">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 ring-1 ring-white/30">
                <Link2 size={25} />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-50">LinkP Account</p>
                <h1 className="text-2xl font-bold tracking-tight">Xác nhận quyền truy cập</h1>
              </div>
            </div>
          </div>

          <div className="p-7 sm:p-8">
            {status === 'loading' && (
              <div className="flex min-h-64 flex-col items-center justify-center gap-4 text-slate-500">
                <LoaderCircle className="animate-spin text-blue-600" size={34} />
                <p className="font-medium">Đang kiểm tra yêu cầu ủy quyền…</p>
              </div>
            )}

            {status === 'signin' && (
              <form onSubmit={signIn} className="space-y-5">
                <div>
                  <h2 className="text-xl font-bold">Đăng nhập để tiếp tục</h2>
                  <p className="mt-1.5 text-sm leading-6 text-slate-500">
                    Đăng nhập tài khoản LinkP trước khi cấp quyền cho ứng dụng.
                  </p>
                </div>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Email</span>
                  <span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
                    <Mail size={18} className="text-slate-400" />
                    <input className="w-full bg-transparent py-3.5 outline-none" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
                  </span>
                </label>
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">Mật khẩu</span>
                  <span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
                    <KeyRound size={18} className="text-slate-400" />
                    <input className="w-full bg-transparent py-3.5 outline-none" type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} />
                  </span>
                </label>
                {error && <ErrorNotice message={error} />}
                <button disabled={submitting} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-5 py-3.5 font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
                  {submitting ? <LoaderCircle className="animate-spin" size={19} /> : <ArrowRight size={19} />}
                  Đăng nhập
                </button>
              </form>
            )}

            {status === 'consent' && details && (
              <div>
                <div className="flex items-center gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                    {details.client.logo_uri ? (
                      <img src={details.client.logo_uri} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <ShieldCheck size={30} className="text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-xl font-bold">{details.client.name}</h2>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                      muốn kết nối với tài khoản <strong className="truncate text-slate-700">{details.user.email}</strong>
                    </p>
                  </div>
                </div>

                <div className="my-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">Ứng dụng sẽ có thể</p>
                  <div className="space-y-3">
                    {scopes.map((scope) => {
                      const [title, description] = SCOPE_LABELS[scope] || [`Quyền ${scope}`, `Truy cập phạm vi “${scope}”.`];
                      return (
                        <div key={scope} className="flex gap-3">
                          <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700"><Check size={16} /></span>
                          <div><p className="text-sm font-semibold">{title}</p><p className="mt-0.5 text-xs leading-5 text-slate-500">{description}</p></div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mb-5 flex items-start gap-2 rounded-xl bg-emerald-50 px-3.5 py-3 text-xs leading-5 text-emerald-800">
                  <LockKeyhole size={16} className="mt-0.5 shrink-0" />
                  LinkP không chia sẻ mật khẩu của bạn. Bạn có thể thu hồi quyền truy cập sau này.
                </div>
                {error && <div className="mb-4"><ErrorNotice message={error} /></div>}

                <div className="grid grid-cols-2 gap-3">
                  <button type="button" disabled={submitting} onClick={() => decide('deny')} className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 px-4 py-3.5 font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60">
                    <X size={18} /> Từ chối
                  </button>
                  <button type="button" disabled={submitting} onClick={() => decide('approve')} className="flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-blue-700 disabled:opacity-60">
                    {submitting ? <LoaderCircle className="animate-spin" size={18} /> : <ShieldCheck size={18} />} Cho phép
                  </button>
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5"><UserRound size={13} /> {details.user.email}</span>
                  {details.client.uri && <a href={details.client.uri} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-blue-600"><ExternalLink size={13} /> Trang ứng dụng</a>}
                </div>
              </div>
            )}

            {status === 'error' && (
              <div className="flex min-h-64 flex-col items-center justify-center text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-600"><X size={28} /></div>
                <h2 className="mt-4 text-xl font-bold">Không thể xác nhận yêu cầu</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">{error}</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function ConsentLoading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#f4f8ff] text-slate-500">
      <div className="flex items-center gap-3 font-medium">
        <LoaderCircle className="animate-spin text-blue-600" size={28} />
        Đang mở yêu cầu ủy quyền…
      </div>
    </main>
  );
}

function ErrorNotice({ message }) {
  return <p role="alert" className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</p>;
}
