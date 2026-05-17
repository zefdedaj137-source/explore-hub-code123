import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Camera, CheckCircle, RotateCcw, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import BottomNav from "@/components/BottomNav";
import { toast } from "sonner";

const POSES = [
  { instruction: "Look straight at the camera and smile 😊", icon: "😊" },
  { instruction: "Turn your head slightly to the left 👈", icon: "👈" },
  { instruction: "Give a thumbs up 👍", icon: "👍" },
  { instruction: "Wave at the camera 👋", icon: "👋" },
];

const PhotoVerificationSelfie = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentPose, setCurrentPose] = useState(0);
  const [photos, setPhotos] = useState<string[]>([]);
  const [cameraActive, setCameraActive] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 480, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setCameraActive(true);
    } catch {
      toast.error("Camera access denied");
    }
  };

  const takePhoto = () => {
    if (!canvasRef.current || !videoRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    canvasRef.current.width = 480;
    canvasRef.current.height = 480;
    ctx.drawImage(videoRef.current, 0, 0, 480, 480);
    const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.8);
    setPhotos([...photos, dataUrl]);

    if (currentPose + 1 < POSES.length) {
      setCurrentPose(currentPose + 1);
    } else {
      stopCamera();
    }
  };

  const stopCamera = () => {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCameraActive(false);
  };

  const reset = () => {
    setPhotos([]);
    setCurrentPose(0);
    setSubmitted(false);
  };

  const submit = () => {
    if (!user) return;
    localStorage.setItem(
      `selfie_verify_${user.id}`,
      JSON.stringify({
        photos: photos.length,
        submitted: true,
        date: new Date().toISOString(),
      })
    );
    setSubmitted(true);
    toast.success("Verification submitted! ✅");
  };

  return (
    <div className="min-h-dvh bg-background pb-24">
      <div className="sticky top-0 z-10 bg-card/80 backdrop-blur-lg border-b px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <ShieldCheck className="h-5 w-5 text-primary" />
        <h1 className="text-lg font-bold">Photo Verification</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-6">
        {submitted ? (
          <Card className="p-8 text-center bg-gradient-to-br from-green-100 to-emerald-100">
            <CheckCircle className="h-20 w-20 mx-auto text-green-500 mb-4" />
            <h2 className="text-xl font-bold">Verification Submitted!</h2>
            <p className="text-muted-foreground mt-2">
              We'll review your photos and update your badge within 24 hours.
            </p>
            <Button variant="outline" className="mt-4" onClick={reset}>
              <RotateCcw className="h-4 w-4 mr-2" /> Retake
            </Button>
          </Card>
        ) : photos.length >= POSES.length ? (
          <div className="space-y-4">
            <Card className="p-4 text-center">
              <h2 className="font-semibold text-lg mb-3">Review your photos</h2>
              <div className="grid grid-cols-2 gap-3">
                {photos.map((p, i) => (
                  <img
                    key={i}
                    src={p}
                    alt={`Pose ${i + 1}`}
                    className="rounded-xl w-full aspect-square object-cover"
                  />
                ))}
              </div>
            </Card>
            <div className="flex gap-2">
              <Button
                onClick={submit}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white"
              >
                Submit for Verification ✅
              </Button>
              <Button variant="outline" onClick={reset}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ) : !cameraActive ? (
          <Card className="p-6 text-center">
            <Camera className="h-16 w-16 mx-auto text-primary/80 mb-4" />
            <h2 className="text-xl font-bold mb-2">Selfie Pose Challenge</h2>
            <p className="text-muted-foreground mb-4">
              Take {POSES.length} selfies matching the poses to verify your identity.
            </p>
            <Button onClick={startCamera} className="bg-primary hover:bg-primary text-white">
              <Camera className="h-4 w-4 mr-2" /> Start Camera
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="p-4 text-center bg-gradient-to-r from-muted to-muted">
              <p className="text-4xl mb-2">{POSES[currentPose].icon}</p>
              <p className="font-semibold">{POSES[currentPose].instruction}</p>
              <p className="text-sm text-muted-foreground">
                Photo {currentPose + 1} of {POSES.length}
              </p>
            </Card>
            <div className="relative rounded-xl overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-square object-cover"
              />
            </div>
            <canvas ref={canvasRef} className="hidden" />
            <Button onClick={takePhoto} className="w-full bg-primary hover:bg-primary text-white">
              <Camera className="h-4 w-4 mr-2" /> Capture {POSES[currentPose].icon}
            </Button>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  );
};

export default PhotoVerificationSelfie;
