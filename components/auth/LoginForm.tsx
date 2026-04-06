"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, User, Check } from "lucide-react";
import { useAuthStore } from "@/lib/authStore";
import SocialButton from "./SocialButton";

export default function LoginForm() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { login, register, loginWithSocial } = useAuthStore();
  const router = useRouter();

  const getStrength = (p: string) => {
    if (!p) return 0;
    let s = 0;
    if (p.length >= 8) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  };
  const strength = getStrength(password);
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength];
  const strengthColor = ["", "bg-red-500", "bg-amber-500", "bg-blue-500", "bg-green-500"][strength];

  const validate = () => {
    const e: Record<string, string> = {};
    if (!email || !/\S+@\S+\.\S+/.test(email)) e.email = "Enter a valid email address";
    if (!password || password.length < 8) e.password = "Password must be at least 8 characters";
    if (mode === "register") {
      if (!username || username.length < 3) e.username = "Username must be at least 3 characters";
      if (password !== confirmPassword) e.confirmPassword = "Passwords do not match";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    if (mode === "login") {
      await login(email, password);
    } else {
      await register(username, email, password);
    }
    setLoading(false);
    setSuccess(true);
    setTimeout(() => router.push("/"), 1200);
  };

  const handleSocial = (provider: "google" | "discord" | "github") => {
    loginWithSocial(provider);
    setSuccess(true);
    setTimeout(() => router.push("/"), 900);
  };

  const inputBase = `w-full h-12 pl-11 pr-4 rounded-xl text-sm transition-all duration-200 outline-none border
    dark:bg-white/5 bg-gray-50
    dark:text-white text-gray-900
    dark:placeholder-white/25 placeholder-gray-400
    focus:ring-0`;
  const inputNormal = `dark:border-white/10 border-gray-200 focus:dark:border-violet-500 focus:border-violet-500 focus:dark:shadow-violet-500/20 focus:shadow-violet-500/15 focus:shadow-lg`;
  const inputError = `dark:border-red-500/50 border-red-400 dark:bg-red-500/5 bg-red-50`;

  if (success) return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-4 py-12 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, delay: 0.1 }} className="w-20 h-20 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center">
        <Check className="text-green-400" size={36} strokeWidth={2.5} />
      </motion.div>
      <h2 className="text-2xl font-bold dark:text-white text-gray-900" style={{ fontFamily: "Sora,sans-serif" }}>Welcome to QuizArena!</h2>
      <p className="dark:text-white/50 text-gray-500 text-sm" style={{ fontFamily: "DM Sans,sans-serif" }}>Redirecting to your dashboard...</p>
    </motion.div>
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-3xl font-bold dark:text-white text-gray-900" style={{ fontFamily: "Sora,sans-serif" }}>
          {mode === "login" ? "Welcome back" : "Create account"}
        </h2>
        <p className="text-sm dark:text-white/50 text-gray-500" style={{ fontFamily: "DM Sans,sans-serif" }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setErrors({}); }} className="text-violet-400 hover:text-violet-300 font-medium transition-colors cursor-pointer">
            {mode === "login" ? "Sign up ->" : "Sign in ->"}
          </button>
        </p>
      </div>

      <div className="flex flex-col gap-2.5">
        <SocialButton provider="google" onClick={() => handleSocial("google")} />
        <SocialButton provider="discord" onClick={() => handleSocial("discord")} />
        <SocialButton provider="github" onClick={() => handleSocial("github")} />
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px dark:bg-white/10 bg-gray-200" />
        <span className="text-xs dark:text-white/30 text-gray-400 font-medium px-1" style={{ fontFamily: "DM Sans,sans-serif" }}>or continue with email</span>
        <div className="flex-1 h-px dark:bg-white/10 bg-gray-200" />
      </div>

      <div className="flex flex-col gap-3">
        <AnimatePresence>
          {mode === "register" && (
            <motion.div key="username" initial={{ opacity: 0, height: 0, marginBottom: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 dark:text-white/30 text-gray-400" size={16} />
                <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} className={`${inputBase} ${errors.username ? inputError : inputNormal}`} style={{ fontFamily: "DM Sans,sans-serif" }} />
              </div>
              {errors.username && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.username}</p>}
            </motion.div>
          )}
        </AnimatePresence>

        <div>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 dark:text-white/30 text-gray-400" size={16} />
            <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className={`${inputBase} ${errors.email ? inputError : inputNormal}`} style={{ fontFamily: "DM Sans,sans-serif" }} />
          </div>
          {errors.email && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.email}</p>}
        </div>

        <div>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 dark:text-white/30 text-gray-400" size={16} />
            <input type={showPassword ? "text" : "password"} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputBase} pr-11 ${errors.password ? inputError : inputNormal}`} style={{ fontFamily: "DM Sans,sans-serif" }} />
            <button onClick={() => setShowPassword(!showPassword)} type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 dark:text-white/30 text-gray-400 hover:dark:text-white/60 hover:text-gray-600 transition-colors">
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          {password && mode === "register" && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : "dark:bg-white/10 bg-gray-200"}`} />
                ))}
              </div>
              <span className={`text-xs font-medium ${["", "text-red-400", "text-amber-400", "text-blue-400", "text-green-400"][strength]}`} style={{ fontFamily: "DM Sans,sans-serif" }}>{strengthLabel}</span>
            </div>
          )}
          {errors.password && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.password}</p>}
        </div>

        <AnimatePresence>
          {mode === "register" && (
            <motion.div key="confirm" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 dark:text-white/30 text-gray-400" size={16} />
                <input type={showConfirm ? "text" : "password"} placeholder="Confirm password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`${inputBase} pr-11 ${errors.confirmPassword ? inputError : inputNormal}`} style={{ fontFamily: "DM Sans,sans-serif" }} />
                <button onClick={() => setShowConfirm(!showConfirm)} type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 dark:text-white/30 text-gray-400 hover:dark:text-white/60 hover:text-gray-600 transition-colors">
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.confirmPassword}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {mode === "login" && (
        <div className="flex justify-end -mt-1">
          <button className="text-xs text-violet-400 hover:text-violet-300 transition-colors" style={{ fontFamily: "DM Sans,sans-serif" }}>
            Forgot password?
          </button>
        </div>
      )}

      <motion.button onClick={handleSubmit} disabled={loading} whileHover={{ y: -2, boxShadow: "0 8px 30px rgba(124,58,237,0.45)" }} whileTap={{ scale: 0.97 }} className="w-full h-12 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-200 disabled:opacity-70 disabled:pointer-events-none cursor-pointer" style={{ fontFamily: "DM Sans,sans-serif" }}>
        {loading ? (
          <>
            <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
              <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            {mode === "login" ? "Signing in..." : "Creating account..."}
          </>
        ) : (
          <>{mode === "login" ? "✓ Sign In" : "✓ Create Account"}</>
        )}
      </motion.button>

      <AnimatePresence>
        {mode === "register" && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-xs dark:text-white/30 text-gray-400 text-center leading-relaxed" style={{ fontFamily: "DM Sans,sans-serif" }}>
            By creating an account you agree to our <span className="text-violet-400 cursor-pointer hover:text-violet-300">Terms of Service</span> and <span className="text-violet-400 cursor-pointer hover:text-violet-300">Privacy Policy</span>
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
