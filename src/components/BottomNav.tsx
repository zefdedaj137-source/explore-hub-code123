import { useNavigate, useLocation } from "react-router-dom";
import { Heart, MessageCircle, Users, Compass, User, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [unreadCount, setUnreadCount] = useState(0);

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
    { icon: Search, label: t("nav.discover"), path: "/discover", badge: 0 },
    { icon: Heart, label: t("nav.likes"), path: "/who-liked-you", badge: 0 },
    { icon: Compass, label: t("nav.radar"), path: "/radar", badge: 0 },
    { icon: MessageCircle, label: t("nav.chat"), path: "/matches", badge: unreadCount },
    { icon: User, label: t("nav.profile"), path: "/my-profile", badge: 0 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="mx-auto max-w-md px-4 pb-3">
        <div className="flex justify-around items-center h-16 rounded-2xl relative overflow-hidden bottom-nav-bar">
          {/* Active glow background pill */}
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            if (!isActive) return null;
            const idx = navItems.indexOf(item);
            const pillLeft = ["left-[1%]", "left-[21%]", "left-[41%]", "left-[61%]", "left-[81%]"];
            return (
              <div
                key={`glow-${item.path}`}
                className={`absolute inset-y-2 w-[18%] rounded-xl transition-all duration-300 nav-glow-pill ${pillLeft[idx]}`}
              />
            );
          })}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className="flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 relative z-10"
              >
                <div className="relative">
                  <Icon
                    className="h-5 w-5 transition-all duration-200"
                    style={{
                      color: isActive ? "#e8274b" : "var(--nav-icon-inactive)",
                      filter: isActive ? "drop-shadow(0 0 8px rgba(232,39,75,0.8))" : "none",
                      transform: isActive ? "scale(1.15)" : "scale(1)",
                    }}
                  />
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-1 badge-rose">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[9px] font-semibold tracking-widest uppercase transition-all duration-200 ${isActive ? "text-[#e8274b]" : "dark:text-white/30 text-muted-foreground"}`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default BottomNav;
