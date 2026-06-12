import { useNavigate, useLocation } from "react-router-dom";
import { Heart, MessageCircle, Compass, User, Search } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);
  const [dailyRewardPending, setDailyRewardPending] = useState(false);
  const [pressedPath, setPressedPath] = useState<string | null>(null);

  // Check if daily reward has not been claimed today
  useEffect(() => {
    if (!user) return;
    const claimKey = `daily_reward_${user.id}`;
    const lastClaim = localStorage.getItem(claimKey);
    const today = new Date().toDateString();
    setDailyRewardPending(lastClaim !== today);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count, error } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .is("read_at", null);
      if (!error) setUnreadCount(count || 0);
    };
    fetchUnread();
    // Listen for new messages
    const channel = supabase
      .channel("unread-badge")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          if ((payload.new as { receiver_id?: string }).receiver_id === user.id) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages" }, () => {
        fetchUnread();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Update PWA badge
  useEffect(() => {
    if ("setAppBadge" in navigator) {
      try {
        if (unreadCount > 0) {
          (navigator as Navigator & { setAppBadge: (n: number) => void }).setAppBadge(unreadCount);
        } else {
          (navigator as Navigator & { clearAppBadge: () => void }).clearAppBadge?.();
        }
      } catch {
        // setAppBadge not supported
      }
    }
  }, [unreadCount]);

  const navItems = [
    { icon: Search, label: t("nav.discover"), path: "/discover", badge: 0, dot: false },
    { icon: Heart, label: t("nav.likes"), path: "/who-liked-you", badge: 0, dot: false },
    { icon: Compass, label: t("nav.radar"), path: "/radar", badge: 0, dot: false },
    { icon: MessageCircle, label: t("nav.chat"), path: "/matches", badge: unreadCount, dot: false },
    { icon: User, label: t("nav.profile"), path: "/my-profile", badge: 0, dot: dailyRewardPending },
  ];

  const handleNav = useCallback(
    (path: string) => {
      // Native iOS-quality haptic tap
      Haptics.impact({ style: ImpactStyle.Light }).catch(() => {
        if ("vibrate" in navigator) navigator.vibrate(8);
      });
      setPressedPath(path);
      setTimeout(() => setPressedPath(null), 150);
      navigate(path);
    },
    [navigate]
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 ios-tab-bar">
      {/* iOS-style frosted glass tab bar — full width, no floating card */}
      <div className="flex justify-around items-end px-1 pt-2 tab-bar-inner">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          const isPressed = pressedPath === item.path;

          return (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              aria-label={item.label}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col items-center justify-center flex-1 gap-[3px] py-1 relative select-none min-h-[44px] transition-transform duration-100 ${isPressed ? "scale-[0.85]" : "scale-100"}`}
            >
              <div className="relative">
                <Icon
                  className="h-[27px] w-[27px] transition-colors duration-150"
                  strokeWidth={isActive ? 2.2 : 1.6}
                  style={{ color: isActive ? "#e8274b" : "var(--nav-icon-inactive)" }}
                />
                {item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-1 badge-rose">
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
                {item.dot && item.badge === 0 && (
                  <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-orange-500 border-2 border-background dot-pulse" />
                )}
              </div>
              <span
                data-active={isActive}
                className="tab-label text-[10px] font-medium tracking-tight transition-colors duration-150"
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
