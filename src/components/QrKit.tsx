import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import jsQR from "jsqr";
import { Camera as CameraIcon, Orbit } from "lucide-react";

export const QR_JOIN_PREFIX = "orbit:join:";

export function encodeInviteQr(inviteCode: string): string {
  return `${QR_JOIN_PREFIX}${inviteCode}`;
}

export function decodeInviteQr(raw: string): string {
  return raw.startsWith(QR_JOIN_PREFIX) ? raw.slice(QR_JOIN_PREFIX.length) : raw;
}

export function QrCodeCanvas({ value, size = 220 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !value) return;
    void QRCode.toCanvas(canvasRef.current, value, {
      width: size,
      margin: 1,
      color: { dark: "#0c0c0c", light: "#ffffff" },
    });
  }, [value, size]);

  return (
    <div className="relative inline-flex items-center justify-center bg-white rounded-2xl p-4 shadow-sm">
      <canvas ref={canvasRef} />
      <div className="absolute w-10 h-10 rounded-full bg-[var(--snap)] flex items-center justify-center border-4 border-white shadow-[0_3px_0_var(--snap-shade)]">
        <Orbit size={18} className="text-[var(--snap-ink)]" />
      </div>
    </div>
  );
}

export function QrScanner({ active, onScan }: { active: boolean; onScan: (text: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>();
  const [error, setError] = useState("");

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let stream: MediaStream | null = null;

    const tick = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(frame.data, frame.width, frame.height);
          if (code?.data) {
            onScan(code.data);
            return;
          }
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        rafRef.current = requestAnimationFrame(tick);
      } catch {
        if (!cancelled) setError("Camera access is unavailable. Enter the code manually below.");
      }
    };

    void start();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [active, onScan]);

  if (!active) return null;

  return (
    <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-black">
      <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
      <canvas ref={canvasRef} className="hidden" />
      {!error && <div className="absolute inset-10 border-2 border-white/70 rounded-2xl pointer-events-none" />}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center bg-black/80">
          <CameraIcon size={22} className="text-white/70" />
          <p className="text-xs text-white/90">{error}</p>
        </div>
      )}
    </div>
  );
}
