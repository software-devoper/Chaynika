import React from "react";
import { User, Mail, Phone, MapPin, Shield } from "lucide-react";

export default function Profile() {
  const user = {
    name: "M/s CHAYANIKA (KALINDI)",
    email: "chayanikakalindi@gmail.com",
    phone: "9832116317",
    address: "Kalindi, Purba Medinipur, 721455",
    role: "Owner / Admin",
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="bg-surface border border-accent/10 rounded-3xl p-8 shadow-xl">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="w-32 h-32 rounded-full bg-accent/10 flex items-center justify-center text-accent border-2 border-accent/20">
            <User size={64} />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-3xl font-display font-bold text-accent mb-2">{user.name}</h2>
            <div className="flex items-center justify-center md:justify-start gap-2 text-muted">
              <Shield size={16} />
              <span className="text-sm font-medium uppercase tracking-wider">{user.role}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 bg-primary/30 rounded-2xl border border-accent/5">
              <div className="p-3 rounded-xl bg-accent/10 text-accent">
                <Mail size={20} />
              </div>
              <div>
                <div className="text-xs text-muted uppercase tracking-wider mb-1">Email Address</div>
                <div className="text-text font-medium">{user.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-primary/30 rounded-2xl border border-accent/5">
              <div className="p-3 rounded-xl bg-accent/10 text-accent">
                <Phone size={20} />
              </div>
              <div>
                <div className="text-xs text-muted uppercase tracking-wider mb-1">Phone Number</div>
                <div className="text-text font-medium">{user.phone}</div>
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
                <div className="text-text font-medium leading-relaxed">{user.address}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface border border-accent/10 rounded-3xl p-8 shadow-xl">
        <h3 className="text-xl font-display font-bold text-accent mb-6">Security Settings</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-primary/30 rounded-2xl border border-accent/5">
            <div>
              <div className="text-text font-medium">Two-Factor Authentication</div>
              <div className="text-xs text-muted">OTP verification is enabled for your phone number</div>
            </div>
            <div className="px-3 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded-full uppercase tracking-wider">
              Active
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
