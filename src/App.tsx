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
import { settingsApi, profileApi, cleanupApi } from "./lib/api";
import ErrorBoundary from "./components/ErrorBoundary";
import { 
  signInAnonymously,
  onAuthStateChanged,
  signOut
} from "firebase/auth";
import { auth } from "./lib/firebase";
import Logo from "./components/Logo";
import { Loader2, Lock, User as UserIcon, Eye, EyeOff } from "lucide-react";

import { AnimatePresence, motion } from "motion/react";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const [accessPassword, setAccessPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Apply saved theme on initial load
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light');
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await profileApi.get(user.uid);
          if (profile) {
            setIsAuthenticated(true);
            setFullName(profile.fullName || "");
            cleanupApi.runCleanup(); // Run cleanup for restored sessions
          } else {
            // If profile is not found (e.g. due to permission denied or database not found),
            // we don't force logout here because it might interrupt a login in progress.
            // The handleAccess function will set isAuthenticated to true.
          }
        } catch (err: any) {
          // Silently ignore errors here to avoid disrupting the UI
        }
      } else {
        setIsAuthenticated(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleAccess = async () => {
    if (!fullName || !accessPassword) {
      return toast.error("Please enter both Full Name and Access Password");
    }
    
    setIsActionLoading(true);
    try {
      // Sign in anonymously FIRST to get permissions
      const userCredential = await signInAnonymously(auth);
      const uid = userCredential.user.uid;

      // Now check the password
      const isValid = await settingsApi.verifyAccessPassword(accessPassword);
      if (!isValid) {
        await signOut(auth); // Sign out if password is wrong
        setIsActionLoading(false);
        return toast.error("Oops! That's not the right access password. Please check and try again.");
      }

      // Save profile only if it doesn't exist or name changed
      const existingProfile = await profileApi.get(uid);
      if (!existingProfile || existingProfile.fullName !== fullName) {
        await profileApi.update(uid, fullName);
      }
      
      setIsAuthenticated(true);
      setFullName(fullName);
      toast.success(`Welcome, ${fullName}!`);
      
      // Run cleanup logic for old records after successful login
      cleanupApi.runCleanup();
    } catch (err: any) {
      console.error("Access Error:", err);
      // If we signed in but something failed, sign out
      if (auth.currentUser) await signOut(auth);
      toast.error(err.message || "Access failed");
    } finally {
      setIsActionLoading(false);
    }
  };
  const handleLogout = async () => {
    try {
      await signOut(auth);
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
            <h2 className="text-2xl font-display font-bold text-accent mb-6">Sales</h2>
            <Bill />
          </>
        );
      case "due":
        return (
          <>
            <h2 className="text-2xl font-display font-bold text-accent mb-6">Dues</h2>
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
              <Logo size={80} showText={false} className="mb-4" />
              <h1 className="text-3xl font-display font-bold text-accent">Access Chayanika</h1>
              <p className="text-muted mt-2">Enter details to access the page</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-muted mb-2">Full Name</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent/50" />
                  <input 
                    type="text" 
                    placeholder="Enter ur full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAccess()}
                    className="w-full bg-primary border border-accent/10 rounded-xl pl-12 pr-4 py-3 text-text focus:border-accent outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-muted mb-2">Chayanika Access Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-accent/50" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    placeholder="Enter access password"
                    value={accessPassword}
                    onChange={(e) => setAccessPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAccess()}
                    className="w-full bg-primary border border-accent/10 rounded-xl pl-12 pr-12 py-3 text-text focus:border-accent outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-accent/50 hover:text-accent transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button 
                onClick={handleAccess}
                disabled={isActionLoading}
                className="w-full bg-accent text-primary font-bold py-3 rounded-xl hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isActionLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                Access Page
              </button>
            </div>
          </div>
          <Toaster position="top-right" />
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-primary">
        <Navbar onMenuClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} />
        <div className="flex pt-16">
          <div className={cn(
            "fixed inset-0 z-40 bg-primary/80 lg:hidden",
            isMobileSidebarOpen ? "block" : "hidden"
          )} onClick={() => setIsMobileSidebarOpen(false)} />
          <div className={cn(
            "lg:block z-50",
            isMobileSidebarOpen ? "block" : "hidden"
          )}>
            <Sidebar 
              activeTab={activeTab} 
              setActiveTab={(tab) => { setActiveTab(tab); setIsMobileSidebarOpen(false); }}
              collapsed={collapsed} 
              setCollapsed={setCollapsed}
              onLogout={handleLogout}
            />
          </div>
          <main 
            className={cn(
              "flex-1 p-4 sm:p-6 transition-all duration-200 w-full overflow-x-hidden",
              collapsed ? "lg:ml-20" : "lg:ml-[220px]"
            )}
          >
            <div className="max-w-7xl mx-auto w-full">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderContent()}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
        <Toaster position="top-right" />
      </div>
    </ErrorBoundary>
  );
}
