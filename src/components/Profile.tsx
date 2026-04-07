import React, { useState, useEffect } from "react";
import Logo from "./Logo";
import { User, Mail, Phone, MapPin, Shield, Lock, Loader2, Eye, EyeOff, Moon, Sun, Palette } from "lucide-react";
import { auth } from "../lib/firebase";
import { profileApi, settingsApi } from "../lib/api";
import { toast } from "react-hot-toast";
import { motion } from "motion/react";

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSavingBusinessInfo, setIsSavingBusinessInfo] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showBusinessForm, setShowBusinessForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLightMode, setIsLightMode] = useState(false);

  const [businessInfo, setBusinessInfo] = useState({
    name: "M/s CHAYANIKA (KALINDI)",
    email: "chayanikakalindi@gmail.com",
    phone: "9832116317",
    address: "Kalindi, Purba Medinipur, 721455",
    role: "Owner / Admin",
  });

  const [editInfo, setEditInfo] = useState(businessInfo);

  useEffect(() => {
    const fetchData = async () => {
      if (auth.currentUser) {
        const [profileData, infoData] = await Promise.all([
          profileApi.get(auth.currentUser.uid),
          settingsApi.getBusinessInfo()
        ]);
        setProfile(profileData);
        if (infoData) {
          setBusinessInfo(prev => ({ ...prev, ...infoData }));
          setEditInfo(prev => ({ ...prev, ...infoData }));
        }
      }
      setLoading(false);
    };
    fetchData();
    
    // Check initial theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
      document.documentElement.classList.add('light');
      setIsLightMode(true);
    } else {
      setIsLightMode(document.documentElement.classList.contains('light'));
    }
  }, []);

  const toggleTheme = () => {
    if (isLightMode) {
      document.documentElement.classList.remove('light');
      localStorage.setItem('theme', 'dark');
      setIsLightMode(false);
    } else {
      document.documentElement.classList.add('light');
      localStorage.setItem('theme', 'light');
      setIsLightMode(true);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword) return toast.error("Please enter a new password");
    if (!confirmPassword) return toast.error("Please confirm your new password");
    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match. Please try again.");
    }
    
    setIsChangingPassword(true);
    try {
      await settingsApi.updateAccessPassword(newPassword);
      toast.success("Access password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to update password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUpdateBusinessInfo = async () => {
    setIsSavingBusinessInfo(true);
    try {
      await settingsApi.updateBusinessInfo(editInfo);
      setBusinessInfo(editInfo);
      setShowBusinessForm(false);
      toast.success("Business information updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update business info");
    } finally {
      setIsSavingBusinessInfo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.15 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="max-w-4xl mx-auto space-y-8"
    >
      <motion.div variants={itemVariants} className="bg-surface border border-accent/10 rounded-3xl p-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <Logo size={128} showText={false} />
          <div className="flex-1 text-center md:text-left">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-display font-bold text-accent mb-2">
                  {profile?.fullName || businessInfo.name}
                </h2>
                <div className="flex items-center justify-center md:justify-start gap-2 text-muted">
                  <Shield size={16} />
                  <span className="text-sm font-medium uppercase tracking-wider">{businessInfo.role}</span>
                </div>
              </div>
              <button 
                onClick={() => setShowBusinessForm(!showBusinessForm)}
                className="px-6 py-2 bg-accent/10 text-accent border border-accent/20 rounded-xl font-bold hover:bg-accent hover:text-primary transition-all text-sm"
              >
                {showBusinessForm ? "Cancel Edit" : "Edit Business Info"}
              </button>
            </div>
          </div>
        </div>

        {showBusinessForm ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12 p-6 bg-primary/20 rounded-3xl border border-accent/10">
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-2">Business Name</label>
                <input 
                  type="text"
                  value={editInfo.name}
                  onChange={(e) => setEditInfo({ ...editInfo, name: e.target.value })}
                  className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-2 text-text focus:border-accent outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-2">Email Address</label>
                <input 
                  type="email"
                  value={editInfo.email}
                  onChange={(e) => setEditInfo({ ...editInfo, email: e.target.value })}
                  className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-2 text-text focus:border-accent outline-none"
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-2">Phone Number</label>
                <input 
                  type="text"
                  value={editInfo.phone}
                  onChange={(e) => setEditInfo({ ...editInfo, phone: e.target.value })}
                  className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-2 text-text focus:border-accent outline-none"
                />
              </div>
              <div>
                <label className="block text-xs text-muted uppercase tracking-wider mb-2">Business Address</label>
                <input 
                  type="text"
                  value={editInfo.address}
                  onChange={(e) => setEditInfo({ ...editInfo, address: e.target.value })}
                  className="w-full bg-primary border border-accent/10 rounded-xl px-4 py-2 text-text focus:border-accent outline-none"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <button 
                onClick={handleUpdateBusinessInfo}
                disabled={isSavingBusinessInfo}
                className="w-full bg-accent text-primary font-bold py-3 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSavingBusinessInfo && <Loader2 className="w-5 h-5 animate-spin" />}
                Save Business Information
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-primary/30 rounded-2xl border border-accent/5">
                <div className="p-3 rounded-xl bg-accent/10 text-accent">
                  <Mail size={20} />
                </div>
                <div>
                  <div className="text-xs text-muted uppercase tracking-wider mb-1">Email Address</div>
                  <div className="text-text font-medium">{businessInfo.email}</div>
                </div>
              </div>

              <div className="flex items-center gap-4 p-4 bg-primary/30 rounded-2xl border border-accent/5">
                <div className="p-3 rounded-xl bg-accent/10 text-accent">
                  <Phone size={20} />
                </div>
                <div>
                  <div className="text-xs text-muted uppercase tracking-wider mb-1">Phone Number</div>
                  <div className="text-text font-medium">{businessInfo.phone}</div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-primary/30 rounded-2xl border border-accent/5 h-full">
                <div className="p-3 rounded-xl bg-accent/10 text-accent self-start">
                  <MapPin size={20} />
                </div>
                <div>
                  <div className="text-xs text-muted uppercase tracking-wider mb-1">Business Address</div>
                  <div className="text-text font-medium leading-relaxed">{businessInfo.address}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </motion.div>

      <motion.div variants={itemVariants} className="bg-surface border border-accent/10 rounded-3xl p-8 shadow-xl">
        <h3 className="text-xl font-display font-bold text-accent mb-6">Security Settings</h3>
        <div className="space-y-4">
          <div className="p-4 bg-primary/30 rounded-2xl border border-accent/5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10 text-accent">
                  <Lock size={18} />
                </div>
                <div>
                  <div className="text-text font-medium">Chayanika Access Password</div>
                  <div className="text-xs text-muted">Change the global password used to access the app</div>
                </div>
              </div>
              <button 
                onClick={() => setShowPasswordForm(!showPasswordForm)}
                className="text-accent text-sm font-bold hover:underline"
              >
                {showPasswordForm ? "Cancel" : "Change Password"}
              </button>
            </div>

            {showPasswordForm && (
              <div className="flex flex-col gap-3 mt-4">
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter new access password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-primary border border-accent/10 rounded-xl pl-4 pr-12 py-2 text-text focus:border-accent outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-accent/50 hover:text-accent transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm new access password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-primary border border-accent/10 rounded-xl pl-4 pr-12 py-2 text-text focus:border-accent outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-accent/50 hover:text-accent transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <button 
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                  className="w-full sm:w-auto bg-accent text-primary font-bold px-6 py-2 rounded-xl hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isChangingPassword && <Loader2 className="w-4 h-4 animate-spin" />}
                  Update Password
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-primary/30 rounded-2xl border border-accent/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10 text-accent">
                <Shield size={18} />
              </div>
              <div>
                <div className="text-text font-medium">Anonymous Authentication</div>
                <div className="text-xs text-muted">Your session is secured via anonymous login</div>
              </div>
            </div>
            <div className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded-full uppercase tracking-wider">
              Active
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div variants={itemVariants} className="bg-surface border border-accent/10 rounded-3xl p-8 shadow-xl">
        <h3 className="text-xl font-display font-bold text-accent mb-6">Preferences</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-primary/30 rounded-2xl border border-accent/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-accent/10 text-accent">
                <Palette size={18} />
              </div>
              <div>
                <div className="text-text font-medium">Appearance</div>
                <div className="text-xs text-muted">Toggle between light and dark mode</div>
              </div>
            </div>
            <button 
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 bg-surface border border-accent/20 rounded-xl hover:border-accent transition-all text-sm font-medium text-text"
            >
              {isLightMode ? (
                <>
                  <Moon size={16} className="text-accent" />
                  <span>Dark Mode</span>
                </>
              ) : (
                <>
                  <Sun size={16} className="text-accent" />
                  <span>Light Mode</span>
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
