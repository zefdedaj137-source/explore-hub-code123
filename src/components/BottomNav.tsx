import { useNavigate, useLocation } from "react-router-dom";
import { Heart, MessageCircle, Users, Compass, User, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("receiver_id", user.id)
        .is("read_at", null);
      setUnreadCount(count || 0);
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
      if (unreadCount > 0) {
        (navigator as Navigator & { setAppBadge: (n: number) => void }).setAppBadge(unreadCount);
      } else {
        (navigator as Navigator & { clearAppBadge: () => void }).clearAppBadge?.();
      }
    }
  }, [unreadCount]);

  const navItems = [
    { icon: Search, label: "Discover", path: "/discover", badge: 0 },
    { icon: Heart, label: "Likes", path: "/who-liked-you", badge: 0 },
    { icon: Compass, label: "Radar", path: "/radar", badge: 0 },
    { icon: MessageCircle, label: "Chat", path: "/matches", badge: unreadCount },
    { icon: User, label: "Profile", path: "/my-profile", badge: 0 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 pb-safe">
      <div className="mx-auto max-w-md px-4 pb-3">
        <div className="flex justify-around items-center h-16 bg-card/90 backdrop-blur-xl border border-white/8 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.45)]">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center flex-1 h-full gap-0.5 transition-all duration-200 rounded-xl ${
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="relative">
                  <Icon
                    className={`h-5 w-5 transition-all duration-200 ${isActive ? "scale-110" : ""}`}
                    style={isActive ? { filter: "drop-shadow(0 0 6px hsl(350,65%,60%,0.7))" } : {}}
                  />
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 bg-primary text-white text-[9px] font-bold rounded-full min-w-[15px] h-[15px] flex items-center justify-center px-1">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span
                  className={`text-[9px] font-medium tracking-wide uppercase ${isActive ? "text-primary" : ""}`}
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
