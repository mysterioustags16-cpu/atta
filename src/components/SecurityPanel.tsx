import React from "react";
import { 
  Laptop, 
  Smartphone, 
  Globe, 
  Trash2, 
  ShieldCheck, 
  Clock, 
  MapPin, 
  LogOut, 
  RefreshCw,
  Info
} from "lucide-react";
import { UserSession, safeFormatDateTime } from "../types";
import api from "../lib/api";

interface SecurityPanelProps {
  onToast: (msg: string, type: "success" | "warning" | "info" | "error") => void;
}

export const SecurityPanel: React.FC<SecurityPanelProps> = ({ onToast }) => {
  const [sessions, setSessions] = React.useState<UserSession[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isTerminating, setIsTerminating] = React.useState<string | null>(null);

  const loadSessions = async () => {
    setIsLoading(true);
    try {
      const data = await api.auth.getSessions();
      // Show only current session and sessions active within past 6 hours
      const sixHoursAgo = Date.now() - 6 * 60 * 60 * 1000;
      const filtered = data.filter((s: UserSession) => s.isCurrent || new Date(s.lastActive || s.createdAt).getTime() >= sixHoursAgo);
      setSessions(filtered);
    } catch (err: any) {
      onToast(err.message || "Failed to load active sessions", "error");
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadSessions();
  }, []);

  const handleTerminateSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to log out from this device?")) return;
    
    setIsTerminating(sessionId);
    try {
      await api.auth.terminateSession(sessionId);
      setSessions(sessions.filter(s => s.id !== sessionId));
      onToast("Device logged out successfully", "success");
    } catch (err: any) {
      onToast(err.message || "Failed to terminate session", "error");
    } finally {
      setIsTerminating(null);
    }
  };

  const handleTerminateAllOther = async () => {
    if (!confirm("Are you sure you want to log out from all other devices?")) return;
    
    setIsLoading(true);
    try {
      await api.auth.terminateAllOtherSessions();
      await loadSessions();
      onToast("All other devices logged out successfully", "success");
    } catch (err: any) {
      onToast(err.message || "Failed to terminate all sessions", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const currentSession = Array.isArray(sessions) ? sessions.find(s => s.isCurrent) : undefined;
  const otherSessions = Array.isArray(sessions) ? sessions.filter(s => !s.isCurrent) : [];

  const DeviceIcon = ({ os }: { os: string }) => {
    const lowOs = os?.toLowerCase() || "";
    if (lowOs.includes("ios") || lowOs.includes("android")) return <Smartphone className="w-5 h-5" />;
    if (lowOs.includes("windows") || lowOs.includes("mac") || lowOs.includes("linux")) return <Laptop className="w-5 h-5" />;
    return <Globe className="w-5 h-5" />;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-150 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-950 text-sm">Security & Active Devices</h3>
              <p className="text-[10px] text-gray-400">Manage and monitor where your account is currently logged in (active in past 6 hours).</p>
            </div>
          </div>
          <button 
            onClick={loadSessions}
            disabled={isLoading}
            className="p-2 hover:bg-slate-50 rounded-full transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Current Device */}
          <div>
            <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-wider mb-3">Your Current Device</h4>
            {currentSession ? (
              <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-blue-100 bg-blue-50/30">
                <div className="w-12 h-12 rounded-xl bg-white border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                  <DeviceIcon os={currentSession.os} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-black text-slate-900 truncate">
                      {currentSession.deviceName || "Current Device"}
                    </h5>
                    <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[9px] font-black uppercase">Active Now</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-[10px] text-slate-500 font-bold">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {currentSession.browser}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {currentSession.ipAddress}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-20 flex items-center justify-center border border-dashed border-gray-200 rounded-xl">
                <p className="text-xs text-gray-400">Retrieving session data...</p>
              </div>
            )}
          </div>

          {/* Other Devices */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-[11px] font-black text-gray-500 uppercase tracking-wider">Other Active Devices (Past 6 Hours)</h4>
              {otherSessions.length > 0 && (
                <button 
                  onClick={handleTerminateAllOther}
                  className="text-[10px] font-black text-red-500 hover:text-red-600 flex items-center gap-1 transition select-none cursor-pointer"
                >
                  <LogOut className="w-3 h-3" /> Terminate All Others
                </button>
              )}
            </div>

            <div className="space-y-2.5">
              {otherSessions.length > 0 ? (
                otherSessions.map(session => (
                  <div key={session.id} className="flex items-center gap-4 p-3.5 rounded-xl border border-gray-100 hover:border-gray-200 hover:bg-gray-50/50 transition">
                    <div className="w-10 h-10 rounded-lg bg-white border border-gray-150 flex items-center justify-center text-gray-400 shrink-0">
                      <DeviceIcon os={session.os} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-[11px] font-extrabold text-slate-800 truncate">
                        {session.deviceName}
                      </h5>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5 text-[9px] text-slate-400 font-bold">
                        <span className="flex items-center gap-1">
                          {session.browser}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" /> Last active: {safeFormatDateTime(session.lastActive)}
                        </span>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleTerminateSession(session.id)}
                      disabled={isTerminating === session.id}
                      className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-8 px-4 text-center border-2 border-dashed border-gray-100 rounded-2xl">
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center mx-auto mb-3 text-slate-300">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-400">No other active devices detected</p>
                  <p className="text-[10px] text-slate-300 mt-1">Your account is safe and only active on this device.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-amber-50/50 border-t border-amber-100 p-4 flex gap-3">
          <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-amber-700 leading-relaxed font-semibold">
            If you see any device that you don't recognize, we recommend logging it out immediately and changing your password to secure your Flour mill workspace.
          </p>
        </div>
      </div>
    </div>
  );
};
