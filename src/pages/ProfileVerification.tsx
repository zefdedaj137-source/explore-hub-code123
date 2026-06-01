import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ShieldCheck, ArrowLeft, Camera, CheckCircle, Clock, XCircle, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";

const ProfileVerification = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [idFile, setIdFile] = useState<File | null>(null);
  const [idPreview, setIdPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<string | null>(null);

  // Camera state
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const loadStatus = useCallback(async () => {
    if (!user) return;

    // Check if already verified via profile flag
    const { data: profile } = await supabase
      .from("profiles")
      .select("verified")
      .eq("id", user.id)
      .single();
    if (profile?.verified) {
      setStatus("approved");
      return;
    }

    const { data } = await supabase
      .from("verification_requests")
      .select("status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setStatus(data?.status || null);
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    setLoading(true);
    loadStatus().finally(() => setLoading(false));
  }, [user, navigate, loadStatus]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [cameraStream]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
      });
      setCameraStream(stream);
      setCameraActive(true);
      // Attach stream to video element on next tick
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {
            // Suppress AbortError when a new load interrupts a pending play()
          });
        }
      }, 50);
    } catch {
      toast.error(t("profileVerification.cameraDenied"));
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
    }
    setCameraStream(null);
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `selfie-${Date.now()}.jpg`, { type: "image/jpeg" });
        setSelfieFile(file);
        setSelfiePreview(URL.createObjectURL(blob));
        stopCamera();
        toast.success(t("profileVerification.selfieCaptured"));
      },
      "image/jpeg",
      0.85
    );
  };

  const handleSelfieFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelfieFile(file);
    setSelfiePreview(URL.createObjectURL(file));
  };

  const handleIdFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIdFile(file);
    setIdPreview(URL.createObjectURL(file));
  };

  const uploadFile = async (file: File, type: "selfie" | "id") => {
    if (!user) return null;
    const fileExt = file.name.split(".").pop();
    const filePath = `${user.id}/${type}-${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage
      .from("verification-uploads")
      .upload(filePath, file, { upsert: true });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("verification-uploads").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!selfieFile) {
      toast.error(t("profileVerification.selfieFirst"));
      return;
    }
    try {
      setUploading(true);
      const selfieUrl = await uploadFile(selfieFile, "selfie");
      const idUrl = idFile ? await uploadFile(idFile, "id") : null;
      const { error } = await supabase.from("verification_requests").insert({
        user_id: user.id,
        selfie_url: selfieUrl,
        id_url: idUrl,
        notes: notes || null,
      });
      if (error) throw error;
      toast.success(t("profileVerification.submitted"));
      setSelfieFile(null);
      setSelfiePreview(null);
      setIdFile(null);
      setIdPreview(null);
      setNotes("");
      loadStatus();
    } catch (error) {
      logger.error("Verification request error", error);
      toast.error(t("profileVerification.failedSubmit"));
    } finally {
      setUploading(false);
    }
  };

  const StatusCard = () => {
    if (status === "approved")
      return (
        <Card className="p-6 rounded-2xl border-2 border-green-500/30 bg-green-500/10 text-center">
          <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-foreground mb-1">
            {t("profileVerification.alreadyVerified")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("profileVerification.verifiedBadgeActive")}
          </p>
        </Card>
      );
    if (status === "pending")
      return (
        <Card className="p-6 rounded-2xl border-2 border-yellow-500/30 bg-yellow-500/10 text-center">
          <Clock className="h-14 w-14 text-yellow-500 mx-auto mb-3 animate-pulse" />
          <h2 className="text-xl font-bold text-foreground mb-1">
            {t("profileVerification.underReview")}
          </h2>
          <p className="text-sm text-muted-foreground">
            {t("profileVerification.underReviewMessage")}
          </p>
        </Card>
      );
    if (status === "rejected")
      return (
        <Card className="p-6 rounded-2xl border-2 border-red-500/30 bg-red-500/10 text-center">
          <XCircle className="h-14 w-14 text-red-500 mx-auto mb-3" />
          <h2 className="text-xl font-bold text-foreground mb-1">
            {t("profileVerification.requestDeclined")}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            {t("profileVerification.tryAgainClearer")}
          </p>
          <Button
            className="w-full bg-gradient-to-r from-primary to-purple-600 text-white"
            onClick={() => setStatus(null)}
          >
            {t("profileVerification.tryAgain")}
          </Button>
        </Card>
      );
    return null;
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="container mx-auto max-w-2xl p-4">
        <div className="bg-card rounded-2xl p-5 mb-6 shadow-card">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <ShieldCheck className="h-10 w-10 text-primary" />
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {t("profileVerification.title")}
                </h1>
                <p className="text-sm text-muted-foreground">{t("profileVerification.subtitle")}</p>
              </div>
            </div>
            <Button
              variant="outline"
              className="rounded-full"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/discover"))}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.back")}
            </Button>
          </div>
        </div>

        {loading ? (
          <Card className="p-8 text-center rounded-2xl border-2 border-border">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto" />
          </Card>
        ) : status && status !== "rejected" ? (
          <StatusCard />
        ) : (
          <div className="space-y-4">
            {/* Why verify */}
            <Card className="p-5 rounded-2xl border border-primary/20 bg-primary/5">
              <h3 className="font-semibold text-foreground mb-2">
                {t("profileVerification.whyVerify")}
              </h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-green-400">?</span> {t("profileVerification.benefit1")}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">?</span> {t("profileVerification.benefit2")}
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-green-400">?</span> {t("profileVerification.benefit3")}
                </li>
              </ul>
            </Card>

            {/* Step 1: Selfie */}
            <Card className="p-5 rounded-2xl border-2 border-border">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-primary text-white text-xs flex items-center justify-center font-bold">
                  1
                </span>
                Take a Selfie
                <span className="text-red-500 text-xs font-normal ml-1">
                  {t("profileVerification.required")}
                </span>
              </h3>

              {selfiePreview ? (
                <div className="relative">
                  <img
                    src={selfiePreview}
                    alt="Selfie preview"
                    className="w-full max-h-48 object-cover rounded-xl"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setSelfieFile(null);
                      setSelfiePreview(null);
                    }}
                  >
                    {t("profileVerification.retake")}
                  </Button>
                </div>
              ) : cameraActive ? (
                <div className="space-y-3">
                  <video
                    ref={videoRef}
                    className="w-full rounded-xl bg-black"
                    autoPlay
                    playsInline
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="flex gap-2">
                    <Button className="flex-1 bg-primary text-white" onClick={capturePhoto}>
                      <Camera className="h-4 w-4 mr-2" />
                      {t("profileVerification.takeSelfie")}
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={stopCamera}>
                      {t("common.cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button
                    className="flex-1 bg-gradient-to-r from-primary to-purple-600 text-white"
                    onClick={startCamera}
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    {t("profileVerification.useCamera")}
                  </Button>
                  <label className="flex-1">
                    <Button variant="outline" className="w-full pointer-events-none" asChild>
                      <span>
                        <Upload className="h-4 w-4 mr-2" />
                        {t("profileVerification.uploadPhoto")}
                      </span>
                    </Button>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleSelfieFileInput}
                    />
                  </label>
                </div>
              )}
            </Card>

            {/* Step 2: ID (optional) */}
            <Card className="p-5 rounded-2xl border-2 border-border">
              <h3 className="font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="h-6 w-6 rounded-full bg-muted text-muted-foreground text-xs flex items-center justify-center font-bold">
                  2
                </span>
                Upload ID
                <span className="text-muted-foreground text-xs font-normal ml-1">
                  {t("profileVerification.optional")}
                </span>
              </h3>
              {idPreview ? (
                <div className="relative">
                  <img
                    src={idPreview}
                    alt="ID preview"
                    className="w-full max-h-36 object-cover rounded-xl"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setIdFile(null);
                      setIdPreview(null);
                    }}
                  >
                    {t("profileVerification.remove")}
                  </Button>
                </div>
              ) : (
                <label className="block">
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors">
                    <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {t("profileVerification.uploadPassportId")}
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-1">
                      {t("profileVerification.speedsUpReview")}
                    </p>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleIdFileInput}
                  />
                </label>
              )}
            </Card>

            {/* Notes */}
            <Textarea
              placeholder={t("profileVerification.optionalNote")}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded-xl"
            />

            <Button
              className="w-full bg-gradient-to-r from-primary to-purple-600 text-white font-bold py-3 rounded-xl text-base"
              onClick={handleSubmit}
              disabled={uploading || !selfieFile}
            >
              {uploading ? t("common.uploading") : t("profileVerification.submit")}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {t("profileVerification.reviewedWithin")}
            </p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default ProfileVerification;
