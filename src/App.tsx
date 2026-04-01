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
import { authApi } from "./lib/api";
import ErrorBoundary from "./components/ErrorBoundary";
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult 
} from "firebase/auth";
import { auth } from "./lib/firebase";

export default function App() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

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

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {
          // reCAPTCHA solved, allow signInWithPhoneNumber.
        }
      });
    }
  };

  const handleSendOtp = async () => {
    if (phone.length !== 10) {
      return toast.error("Please enter a valid 10-digit mobile number");
    }
    
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      const formatPhone = `+91${phone}`;
      
      const confirmation = await signInWithPhoneNumber(auth, formatPhone, appVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      toast.success("OTP sent successfully to your phone!");
    } catch (err: any) {
      console.error("Firebase Auth Error:", err);
      toast.error(err.message || "Failed to send OTP. Please check if Phone Auth is enabled in Firebase Console.");
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      return toast.error("Please enter a valid 6-digit OTP");
    }
    if (!confirmationResult) {
      return toast.error("Please request an OTP first");
    }

    try {
      const userCredential = await confirmationResult.confirm(otp);
      const idToken = await userCredential.user.getIdToken();
      
      await authApi.verifyToken(idToken);
      setIsAuthenticated(true);
      toast.success("Login successful");
    } catch (err: any) {
      console.error("Verification Error:", err);
      toast.error("Invalid OTP or verification failed");
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

            <div className="space-y-6">
              <div id="recaptcha-container"></div>
              {!otpSent ? (
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Mobile Number</label>
                  <input 
                    type="tel" 
                    placeholder="Enter 10-digit number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
                  />
                  <button 
                    onClick={handleSendOtp}
                    className="w-full bg-accent text-primary font-bold py-3 rounded-xl hover:opacity-90 transition-all mt-6"
                  >
                    Send OTP
                  </button>
                </div>
              ) : (
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">Enter OTP</label>
                  <input 
                    type="text" 
                    placeholder="6-digit OTP"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-3 text-text focus:border-accent outline-none transition-all"
                  />
                  <button 
                    onClick={handleVerifyOtp}
                    className="w-full bg-accent text-primary font-bold py-3 rounded-xl hover:opacity-90 transition-all mt-6"
                  >
                    Verify OTP
                  </button>
                  <button 
                    onClick={() => setOtpSent(false)}
                    className="w-full text-muted text-sm mt-4 hover:text-accent transition-all"
                  >
                    Change Phone Number
                  </button>
                </div>
              )}
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
