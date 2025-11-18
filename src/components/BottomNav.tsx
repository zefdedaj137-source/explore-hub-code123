import { useNavigate, useLocation } from "react-router-dom";
import { Heart, MessageCircle, Users, Compass, User, Search } from "lucide-react";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Search, label: "Discover", path: "/discover" },
    { icon: Heart, label: "Likes", path: "/who-liked-you" },
    { icon: Compass, label: "Radar", path: "/radar" },
    { icon: MessageCircle, label: "Chat", path: "/matches" },
    { icon: User, label: "Profile", path: "/my-profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg pb-safe">
      <div className="flex justify-around items-center h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive
                  ? "text-pink-500"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <Icon className={`h-6 w-6 ${isActive ? "fill-pink-500" : ""}`} />
              <span className="text-xs mt-1 font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
