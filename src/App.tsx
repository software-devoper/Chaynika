import React, { useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Purchase from "./components/Purchase";
import Bill from "./components/Bill";
import Revenue from "./components/Revenue";
import Due from "./components/Due";
import Profile from "./components/Profile";
import { Toaster, toast } from "react-hot-toast";
import { cn } from "./lib/utils";
import { authApi, userApi } from "./lib/api";
import ErrorBoundary from "./components/ErrorBoundary";
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut
} from "firebase/auth";
import { auth } from "./lib/firebase";
import { Loader2, Mail } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await authApi.me();
        setIsAuthenticated(true);
      } catch (err) {
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleLogin = async () => {
    if (!username || !password) {
      return toast.error("Please enter both username and password");
    }
    
    setIsActionLoading(true);
    try {
      // 1. Find email by username
      const userData = await userApi.getByUsername(username);
      if (!userData) {
        setIsActionLoading(false);
        return toast.error("Username not found. Please register first.");
      }

      // 2. Sign in with email and password
      const userCredential = await signInWithEmailAndPassword(auth, userData.email, password);
      
      if (!userCredential.user.emailVerified) {
        await signOut(auth);
        setIsActionLoading(false);
        return toast.error("Please verify your email address before logging in. Check your inbox.");
      }

      const idToken = await userCredential.user.getIdToken();
      
      await authApi.verifyToken(idToken);
      setIsAuthenticated(true);
      toast.success("Login successful");
    } catch (err: any) {
      console.error("Login Error:", err);
      if (err.code === 'auth/wrong-password') {
        toast.error("Incorrect password.");
      } else if (err.code === 'auth/user-not-found') {
        toast.error("User account not found.");
      } else {
        toast.error(err.message || "Login failed");
      }
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!username || !email || !password) {
      return toast.error("Please fill in all fields");
    }
    if (password.length < 6) {
      return toast.error("Password must be at least 6 characters");
    }
    
    setIsActionLoading(true);
    try {
      // 1. Check if username is taken
      const existingUser = await userApi.getByUsername(username);
      if (existingUser) {
        setIsActionLoading(false);
        return toast.error("Username is already taken");
      }

      // 2. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      
      // 3. Send verification email
      await sendEmailVerification(userCredential.user);
      
      // 4. Save username mapping to Firestore
      await userApi.create(username, email, userCredential.user.uid);
      
      // 5. Sign out immediately until verified
      await signOut(auth);
      
      setNeedsVerification(true);
      toast.success("Registration successful! Please check your email for verification link.");
    } catch (err: any) {
      console.error("Registration Error:", err);
      toast.error(err.message || "Registration failed");
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (resendTimer > 0) return;
    setIsActionLoading(true);
    try {
      // We need to sign in temporarily to resend
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      await sendEmailVerification(userCredential.user);
      await signOut(auth);
      setResendTimer(60);
      toast.success("Verification email resent!");
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') {
        toast.error("Too many requests. Please wait a minute before trying again.");
        setResendTimer(60);
      } else {
        toast.error(err.message || "Failed to resend email");
      }
    } finally {
      setIsActionLoading(false);
    }
  };
  const handleLogout = async () => {
    try {
      await authApi.logout();
      setIsAuthenticated(false);
      toast.success("Logged out successfully");
    } catch (err) {
      toast.error("Logout failed");
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case "dashboard":
        return (
          <>
            <h2 className="text-2xl font-display font-bold text-accent mb-6">Dashboard</h2>
            <Dashboard setActiveTab={setActiveTab} />
          </>
        );
      case "purchase":
        return (
          <>
            <h2 className="text-2xl font-display font-bold text-accent mb-6">Purchase</h2>
            <Purchase />
          </>
        );
      case "revenue":
        return (
          <>
            <h2 className="text-2xl font-display font-bold text-accent mb-6">Revenue</h2>
            <Revenue />
          </>
        );
      case "bill":
        return (
          <>
            <h2 className="text-2xl font-display font-bold text-accent mb-6">New Bill</h2>
            <Bill />
          </>
        );
      case "due":
        return (
          <>
            <h2 className="text-2xl font-display font-bold text-accent mb-6">Due</h2>
            <Due />
          </>
        );
      case "profile":
        return (
          <>
            <h2 className="text-2xl font-display font-bold text-accent mb-6">Profile</h2>
            <Profile />
          </>
        );
      default:
        return (
          <>
            <h2 className="text-2xl font-display font-bold text-accent mb-6">Dashboard</h2>
            <Dashboard setActiveTab={setActiveTab} />
          </>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-primary flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen bg-primary flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-surface border border-accent/20 rounded-2xl p-8 shadow-2xl">
            <div className="flex flex-col items-center mb-8">
              <div className="w-20 h-20 rounded-full bg-accent flex items-center justify-center text-primary font-display font-bold text-4xl mb-4">
                C
              </div>
              <h1 className="text-3xl font-display font-bold text-accent">Chaynika</h1>
              <p className="text-muted mt-2">Business Management App</p>
            </div>

            {needsVerification ? (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto text-accent">
                  <Mail className="w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-text">Verify your email</h2>
                <p className="text-muted text-sm">
                  We've sent a verification link to <span className="text-accent font-medium">{email}</span>. 
                  Please check your inbox and click the link to activate your account.
                </p>
                <button 
                  onClick={handleResendVerification}
                  disabled={isActionLoading || resendTimer > 0}
                  className="w-full bg-surface border border-accent/20 text-text font-bold py-3 rounded-xl hover:bg-accent/5 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isActionLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend Email"}
                </button>
                <button 
                  onClick={() => {
                    setNeedsVerification(false);
                    setIsRegistering(false);
                  }}
                  className="w-full text-muted text-sm hover:text-accent transition-all"
                >
                  Back to Login
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {isRegistering && (
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Username</label>
                  <input 
                    type="text" 
                    placeholder="Choose a username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
                  />
                </div>
              )}
              
              {!isRegistering ? (
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Username</label>
                  <input 
                    type="text" 
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Email Address</label>
                  <input 
                    type="email" 
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-muted mb-2">Password</label>
                <input 
                  type="password" 
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
                />
              </div>

              {!isRegistering ? (
                <div>
                  <button 
                    onClick={handleLogin}
                    disabled={isActionLoading}
                    className="w-full bg-accent text-primary font-bold py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isActionLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                    Login
                  </button>
                  <p className="text-center text-muted text-sm mt-4">
                    Don't have an account?{" "}
                    <button 
                      onClick={() => setIsRegistering(true)}
                      className="text-accent font-medium hover:underline"
                    >
                      Register
                    </button>
                  </p>
                </div>
              ) : (
                <div>
                  <button 
                    onClick={handleRegister}
                    disabled={isActionLoading}
                    className="w-full bg-accent text-primary font-bold py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isActionLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                    Register
                  </button>
                  <p className="text-center text-muted text-sm mt-4">
                    Already have an account?{" "}
                    <button 
                      onClick={() => setIsRegistering(false)}
                      className="text-accent font-medium hover:underline"
                    >
                      Login
                    </button>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
        <Toaster position="top-right" />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-primary">
        <Navbar />
        <div className="flex pt-16">
          <Sidebar 
            activeTab={activeTab} 
            setActiveTab={setActiveTab} 
            collapsed={collapsed} 
            setCollapsed={setCollapsed}
            onLogout={handleLogout}
          />
          <main 
            className={cn(
              "flex-1 p-6 transition-all duration-200",
              collapsed ? "ml-20" : "ml-[220px]"
            )}
          >
            <div className="max-w-7xl mx-auto">
              {renderContent()}
            </div>
          </main>
        </div>
        <Toaster position="top-right" />
      </div>
    </ErrorBoundary>
  );
}
