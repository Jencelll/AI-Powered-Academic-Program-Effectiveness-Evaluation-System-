import React, { useContext, useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Button } from '../components/ui/button';
import { AuthContext } from '../context/AuthContext';
import { User, Lock, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  // Role is auto-detected after login; no selection in UI
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [remember, setRemember] = useState(true);
  const [touchedId, setTouchedId] = useState(false);
  const [touchedPw, setTouchedPw] = useState(false);
  const [ripple, setRipple] = useState({ x: 0, y: 0, key: 0 });

  // Load logos from env (defaults to placeholders if not set)
  const logoUrls = (process.env.REACT_APP_LOGO_URLS || '/lspu.jfif,/ccs-logo.svg')
    .split(',')
    .map((u) => u.trim())
    .filter(Boolean);
  const lspuLogo = logoUrls[0];
  const ccsLogo = logoUrls[1] || logoUrls[0];
  const appTitle = process.env.REACT_APP_APP_NAME || 'College of Computer Studies';

  useEffect(() => {
    try {
      const savedId = localStorage.getItem('lastIdentifier');
      if (savedId) setIdentifier(savedId);
    } catch {}
  }, []);

  const idIsEmail = useMemo(() => identifier.includes('@'), [identifier]);
  const emailValid = useMemo(() => /.+@.+\..+/.test(identifier), [identifier]);
  const identifierValid = useMemo(() => (idIsEmail ? emailValid : identifier.trim().length >= 3), [idIsEmail, emailValid, identifier]);
  const passwordValid = useMemo(() => password.trim().length >= 6, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setTouchedId(true);
    setTouchedPw(true);
    if (!identifierValid || !passwordValid) return;
    setLoading(true);
    try {
      const usr = await login({ identifier, password });
      if (remember) {
        try { localStorage.setItem('lastIdentifier', identifier); } catch {}
      }
      if (usr.role === 'admin') navigate('/dashboard/admin');
      else if (usr.role === 'faculty') navigate('/dashboard/faculty');
      else navigate('/dashboard/student');
    } catch (err) {
      const msg = err?.message || 'Login failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const onButtonMouseDown = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setRipple({ x, y, key: Date.now() });
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Animated gradient background with subtle floating shapes */}
      <div className="absolute inset-0 -z-20 bg-gradient-to-br from-indigo-200 via-purple-200 to-white dark:from-[#0f172a] dark:via-[#1e1b4b] dark:to-[#0b1320] opacity-70 bg-[length:200%_200%] sm:animate-gradient-slow md:animate-gradient-slower" />
      {/* Ambient radial glow layers */}
      <div className="absolute inset-0 -z-10 pointer-events-none">
        <div className="absolute left-1/2 top-[-10%] -translate-x-1/2 w-[60vw] h-[60vw] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.20),_transparent_60%)] blur-3xl" />
        <div className="absolute left-[10%] bottom-[-10%] w-[40vw] h-[40vw] rounded-full bg-[radial-gradient(ellipse_at_center,_rgba(147,51,234,0.18),_transparent_60%)] blur-3xl" />
      </div>
      {/* Floating shapes */}
      <div className="absolute -z-10 top-10 left-10 w-40 h-40 rounded-full bg-purple-300/20 blur-2xl sm:animate-float-slow" />
      <div className="absolute -z-10 bottom-12 right-16 w-48 h-48 rounded-full bg-indigo-300/20 blur-2xl sm:animate-float-slow" />
      <div className="absolute -z-10 top-1/2 left-1/4 w-32 h-32 rounded-3xl bg-blue-300/20 blur-xl sm:animate-float-slow" />

      {/* Subtle particles */}
      <div className="absolute inset-0 -z-10 pointer-events-none mix-blend-screen">
        <div className="absolute top-24 left-1/3 w-2 h-2 rounded-full bg-white/50 blur-[2px]" />
        <div className="absolute top-1/2 left-[15%] w-[6px] h-[6px] rounded-full bg-white/40 blur-[1px]" />
        <div className="absolute bottom-32 right-[22%] w-[8px] h-[8px] rounded-full bg-white/30 blur-[2px]" />
      </div>

      <Card className="group relative w-full max-w-xl rounded-3xl shadow-2xl bg-white/55 backdrop-blur-2xl border border-white/40 ring-1 ring-indigo-200/40 dark:bg-gray-900/60 dark:border-white/10 dark:ring-indigo-400/20 transition-all duration-300 sm:animate-fade-in-up hover:shadow-[0_20px_60px_rgba(67,56,202,0.25)] hover:scale-[1.01]">
        {/* Soft light glow behind the card */}
        <div className="pointer-events-none absolute -inset-px rounded-[1.6rem] bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.25),_transparent_70%)] blur-xl" />
        <CardHeader>
          {/* Logos row */}
          <div className="relative flex items-center justify-center gap-6 mb-3">
            {/* Ambient light behind logos */}
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_center,_rgba(99,102,241,0.15),_transparent_65%)]" />
            {/* Using public assets from env: REACT_APP_LOGO_URLS=/lspu.jfif,/lspui-seal-ccs.jfif */}
            <img
              src={lspuLogo}
              alt="LSPU logo"
              className="h-12 w-12 rounded-full object-contain ring-2 ring-indigo-200/70 bg-white/70 drop-shadow-md select-none"
              draggable="false"
              loading="lazy"
              decoding="async"
            />
            <img
              src={ccsLogo}
              alt="College of Computer Studies logo"
              className="h-12 w-12 rounded-full object-contain ring-2 ring-indigo-200/70 bg-white/70 drop-shadow-md select-none"
              draggable="false"
              loading="lazy"
              decoding="async"
            />
          </div>

          <CardTitle className="text-center text-3xl font-extrabold tracking-tight text-indigo-900 dark:text-white">
            {appTitle}
          </CardTitle>
          <CardDescription className="text-center text-gray-700 dark:text-gray-300">Sign in to continue</CardDescription>
          <div className="mx-auto mt-3 w-24 border-t border-indigo-200/60 dark:border-indigo-600/40" />
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-5">
            <div>
              <Label htmlFor="identifier" className="text-sm font-medium text-gray-700 dark:text-gray-300">Email or Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-600/80" aria-hidden="true" />
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onBlur={() => setTouchedId(true)}
                  required
                  placeholder="Enter your email or username"
                  className="h-12 rounded-2xl pl-9 shadow-inner transition-all duration-200 ease-out hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400/80 focus:border-indigo-400/80 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                />
              </div>
              {touchedId && !identifierValid && (
                <div className="mt-1 text-xs text-red-600">{idIsEmail ? 'Enter a valid email' : 'Enter at least 3 characters'}</div>
              )}
            </div>
            <div>
              <Label htmlFor="password" className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</Label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-600/80" aria-hidden="true" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyUp={(e) => setCapsOn(e.getModifierState && e.getModifierState('CapsLock'))}
                    onBlur={() => setTouchedPw(true)}
                    required
                    placeholder="Enter your password"
                    className="h-12 rounded-2xl pl-9 shadow-inner transition-all duration-200 ease-out hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-400/80 focus:border-indigo-400/80 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="px-3 py-2 text-sm rounded-xl border border-gray-200/60 dark:border-gray-700/60 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                  onClick={() => setShowPassword((s) => !s)}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-700 dark:text-gray-300" />
                  )}
                </Button>
              </div>
              {capsOn && <div className="mt-1 text-xs text-amber-600">Caps Lock is on</div>}
              {touchedPw && !passwordValid && <div className="mt-1 text-xs text-red-600">Use at least 6 characters</div>}
            </div>

            {error && (
              <div className="p-2 rounded-md border border-red-200 bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <span>Remember me</span>
              </label>
              <a href="#" className="text-indigo-700/90 hover:text-indigo-800 hover:underline">Forgot Password?</a>
              <a href="/create-account" className="text-indigo-700/90 hover:text-indigo-800 hover:underline">Create Account</a>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              onMouseDown={onButtonMouseDown}
              disabled={loading || !identifierValid || !passwordValid}
              className="relative overflow-hidden w-full h-12 rounded-2xl bg-gradient-to-r from-indigo-500 via-fuchsia-500 to-purple-600 text-white shadow-[0_10px_30px_rgba(99,102,241,0.45)] hover:shadow-[0_16px_40px_rgba(99,102,241,0.65)] bg-[length:200%_200%] animate-gradient-slow hover:translate-y-[-1px] active:translate-y-0 font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {/* Ripple effect */}
              <span
                key={ripple.key}
                className="pointer-events-none absolute rounded-full bg-white/60 animate-ripple"
                style={{ left: ripple.x, top: ripple.y, width: 12, height: 12, transform: 'translate(-50%, -50%)' }}
              />
              {loading ? 'Signing in…' : 'Sign In'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;
