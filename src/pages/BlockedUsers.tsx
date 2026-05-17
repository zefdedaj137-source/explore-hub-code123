import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { UserX, ArrowLeft, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

interface BlockedProfile {
  id: string;
  full_name: string;
  age: number;
  profile_image_url: string | null;
  city?: string | null;
  country?: string | null;
}

interface BlockRow {
  blocked_id: string;
  created_at: string;
  blocked_profile?: BlockedProfile | null;
}

const BlockedUsers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [blocks, setBlocks] = useState<BlockRow[]>([]);

  const fetchBlocked = useCallback(async () => {
    if (!user) return;

    // Try join via FK hint first, fall back to manual lookup
    const { data, error } = await supabase
      .from("blocks")
      .select(
        "blocked_id, created_at, blocked_profile:profiles!blocked_id (id, full_name, age, profile_image_url, city, country)"
      )
      .eq("blocker_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setBlocks((data as BlockRow[]) || []);
      return;
    }

    // Fallback: load blocks then fetch profiles separately
    logger.warn("FK join failed, using fallback:", error?.message);
    const { data: blockRows, error: blockError } = await supabase
      .from("blocks")
      .select("blocked_id, created_at")
      .eq("blocker_id", user.id)
      .order("created_at", { ascending: false });

    if (blockError || !blockRows?.length) {
      if (blockError) {
        logger.error("Failed to load blocked users", blockError);
        toast.error("Failed to load blocked users.");
      }
      setBlocks([]);
      return;
    }

    const ids = blockRows.map((r) => r.blocked_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, age, profile_image_url, city, country")
      .in("id", ids);

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));
    setBlocks(
      blockRows.map((r) => ({
        ...r,
        blocked_profile: (profileMap.get(r.blocked_id) as BlockedProfile) || null,
      }))
    );
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    fetchBlocked().finally(() => setLoading(false));
  }, [user, navigate, fetchBlocked]);

  const handleUnblock = async (blockedId: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("blocks")
      .delete()
      .eq("blocker_id", user.id)
      .eq("blocked_id", blockedId);

    if (error) {
      logger.error("Failed to unblock", error);
      toast.error("Failed to unblock user.");
      return;
    }

    setBlocks((prev) => prev.filter((row) => row.blocked_id !== blockedId));
    toast.success("User unblocked.");
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <UserX className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">Blocked Users</h1>
                <p className="text-sm text-muted-foreground">Manage your block list</p>
              </div>
            </div>
            <Button variant="outline" className="rounded-full" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </div>

        {loading ? (
          <Card className="p-8 text-center rounded-2xl border-2 border-border">Loading...</Card>
        ) : blocks.length === 0 ? (
          <Card className="p-8 text-center rounded-2xl border-2 border-border">
            You have no blocked users.
          </Card>
        ) : (
          <div className="space-y-4">
            {blocks.map((block) => (
              <Card key={block.blocked_id} className="p-4 rounded-2xl border-2 border-border">
                <div className="flex items-center gap-4">
                  <img
                    src={block.blocked_profile?.profile_image_url || "/placeholder.svg"}
                    alt={block.blocked_profile?.full_name || "Blocked profile"}
                    className="h-16 w-16 rounded-full object-cover border-2 border-border"
                  />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {block.blocked_profile?.full_name || "Unknown"}
                      {block.blocked_profile?.age ? `, ${block.blocked_profile.age}` : ""}
                    </p>
                    {(block.blocked_profile?.city || block.blocked_profile?.country) && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <MapPin className="h-3 w-3" />
                        <span>
                          {[block.blocked_profile?.city, block.blocked_profile?.country]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleUnblock(block.blocked_id)}
                  >
                    Unblock
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default BlockedUsers;
