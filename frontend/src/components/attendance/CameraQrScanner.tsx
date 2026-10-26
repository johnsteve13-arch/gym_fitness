"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  Camera,
  CameraOff,
  Volume2,
  VolumeX,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  User,
  Award,
  Sparkles,
  Search,
  LogIn,
  LogOut,
  RefreshCw,
  Zap,
} from "lucide-react";

interface ScanResult {
  accessGranted: boolean;
  message?: string;
  reason?: string;
  code?: string;
  canCheckOut?: boolean;
  activeAttendanceId?: string;
  timestamp: string;
  member?: {
    id?: string;
    name?: string;
    memberCode?: string;
    avatarUrl?: string;
    planName?: string;
    daysRemaining?: number;
    rewardCoins?: number;
    expiredDate?: string | Date;
  };
}

interface CameraQrScannerProps {
  onScanComplete?: (result: ScanResult) => void;
  className?: string;
  initialMode?: "in" | "out";
  elementId?: string;
  autoStart?: boolean;
}

export default function CameraQrScanner({
  onScanComplete,
  className = "",
  initialMode = "in",
  elementId = "admin-qr-reader",
  autoStart = true,
}: CameraQrScannerProps) {
  const [mode, setMode] = useState<"in" | "out">(initialMode);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>("");
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanHistory, setScanHistory] = useState<ScanResult[]>([]);
  const [manualQuery, setManualQuery] = useState<string>("");
  const [manualSubmitting, setManualSubmitting] = useState<boolean>(false);

  const qrReaderRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTokenRef = useRef<string>("");
  const lastScanTimestampRef = useRef<number>(0);
  const isScanningRef = useRef<boolean>(false);

  // Web Audio synthesizer for crisp audible feedback
  const playAudioChime = useCallback((success: boolean) => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();

      if (success) {
        // High, bright ascending chime (E5 -> A5)
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(880.0, ctx.currentTime + 0.08); // A5

        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);

        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.12);
        osc2.start(ctx.currentTime + 0.08);
        osc2.stop(ctx.currentTime + 0.35);
      } else {
        // Low rejection buzz
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        osc.frequency.linearRampToValueAtTime(160, ctx.currentTime + 0.25);

        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.28);
      }
    } catch {
      // Ignore audio context autoplay restrictions
    }
  }, [soundEnabled]);

  // Process a decoded QR string or Member Identifier rapidly
  const handleProcessScan = useCallback(
    async (decodedText: string) => {
      const trimmed = decodedText.trim();
      if (!trimmed) return;

      const now = Date.now();
      // Fast Debounce: Only throttle if it's the exact same token scanned within 2.5 seconds
      if (lastScannedTokenRef.current === trimmed && now - lastScanTimestampRef.current < 2500) {
        return;
      }

      lastScannedTokenRef.current = trimmed;
      lastScanTimestampRef.current = now;
      setIsProcessing(true);

      try {
        let result: ScanResult;

        if (mode === "in") {
          const res = await api.verifyAndCheckIn(trimmed, "camera_scanner");
          result = {
            accessGranted: !!res.accessGranted,
            message: res.message || (res.accessGranted ? "Attendance Recorded Successfully!" : res.reason),
            reason: res.reason,
            code: res.code,
            canCheckOut: res.canCheckOut,
            activeAttendanceId: res.activeAttendanceId,
            timestamp: new Date().toLocaleTimeString(),
            member: res.member,
          };
        } else {
          const res = await api.checkOut(trimmed);
          result = {
            accessGranted: !!res.success,
            message: res.message || "Time Out Recorded Successfully!",
            timestamp: new Date().toLocaleTimeString(),
            member: res.member,
          };
        }

        playAudioChime(result.accessGranted);
        setScanResult(result);
        setScanHistory((prev) => [result, ...prev.slice(0, 9)]);

        if (onScanComplete) {
          onScanComplete(result);
        }
      } catch (err: any) {
        const errorResult: ScanResult = {
          accessGranted: false,
          reason: err.message || "Verification failed.",
          timestamp: new Date().toLocaleTimeString(),
        };
        playAudioChime(false);
        setScanResult(errorResult);
      } finally {
        setIsProcessing(false);
      }
    },
    [mode, onScanComplete, playAudioChime]
  );

  // Start camera stream with hardware acceleration and 25+ FPS
  const startCamera = useCallback(async (camId?: string) => {
    const targetCameraId = camId || selectedCameraId;
    if (!targetCameraId) return;
    setCameraError(null);

    try {
      if (!qrReaderRef.current) {
        // High-speed initialization:
        // 1. formatsToSupport restricts decoder to QR codes only (90% faster CPU decoding)
        // 2. useBarCodeDetectorIfSupported enables GPU/C++ native BarcodeDetector API in modern browsers
        qrReaderRef.current = new Html5Qrcode(elementId, {
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          verbose: false,
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true,
          },
        });
      }

      const qr = qrReaderRef.current;
      if (qr.isScanning) {
        await qr.stop();
      }

      // Configure high-frequency scanning
      await qr.start(
        targetCameraId,
        {
          fps: 25, // 25 frames per second for instantaneous detection
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            // Dynamic wider viewfinder box for effortless alignment
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            const qrEdge = Math.floor(minEdge * 0.85);
            return {
              width: Math.max(qrEdge, 240),
              height: Math.max(qrEdge, 240),
            };
          },
          aspectRatio: 1.0,
          videoConstraints: {
            facingMode: { ideal: "environment" },
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
          },
        },
        (decodedText) => {
          handleProcessScan(decodedText);
        },
        () => {
          // Intentionally quiet on frames without QR
        }
      );

      setIsScanning(true);
      isScanningRef.current = true;
    } catch (err: any) {
      setIsScanning(false);
      isScanningRef.current = false;
      setCameraError(
        err.message || "Could not access the selected camera. Please ensure permissions are granted."
      );
    }
  }, [selectedCameraId, elementId, handleProcessScan]);

  // Stop camera stream
  const stopCamera = useCallback(async () => {
    if (qrReaderRef.current && isScanningRef.current) {
      try {
        await qrReaderRef.current.stop();
      } catch {
        // Ignore stop errors
      }
    }
    setIsScanning(false);
    isScanningRef.current = false;
  }, []);

  // Load available camera devices & auto-start
  useEffect(() => {
    let mounted = true;
    const fetchCamerasAndStart = async () => {
      try {
        const devices = await Html5Qrcode.getCameras();
        if (mounted && devices && devices.length > 0) {
          setCameras(devices);
          // Prefer environment / rear camera on mobile, otherwise first available
          const backCam = devices.find((d) => /back|rear|environment/i.test(d.label));
          const chosenId = backCam ? backCam.id : devices[0].id;
          setSelectedCameraId(chosenId);

          if (autoStart) {
            // Give browser DOM a tick to bind elementId
            setTimeout(() => {
              if (mounted) {
                startCamera(chosenId);
              }
            }, 100);
          }
        } else if (mounted) {
          setCameraError("No video cameras detected on this device.");
        }
      } catch (err: any) {
        if (mounted) {
          setCameraError(
            err.message || "Camera permission denied or camera unavailable. Please check browser permissions."
          );
        }
      }
    };

    fetchCamerasAndStart();

    return () => {
      mounted = false;
      if (qrReaderRef.current && isScanningRef.current) {
        qrReaderRef.current.stop().catch(() => {});
      }
    };
  }, []);

  // Manual fallback submission
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    setManualSubmitting(true);
    handleProcessScan(manualQuery.trim()).finally(() => {
      setManualSubmitting(false);
      setManualQuery("");
    });
  };

  // Instant checkout handler for active session
  const handleDirectCheckOut = async (memberIdOrCode: string) => {
    setIsProcessing(true);
    try {
      const res = await api.checkOut(memberIdOrCode);
      const resObj: ScanResult = {
        accessGranted: true,
        message: res.message || "Time Out departure recorded successfully!",
        timestamp: new Date().toLocaleTimeString(),
        member: res.member,
      };
      playAudioChime(true);
      setScanResult(resObj);
      setScanHistory((prev) => [resObj, ...prev.slice(0, 9)]);
      if (onScanComplete) onScanComplete(resObj);
    } catch (err: any) {
      playAudioChime(false);
      setScanResult({
        accessGranted: false,
        reason: err.message || "Failed to check out member.",
        timestamp: new Date().toLocaleTimeString(),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Scanner Mode & Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        {/* Mode Switcher */}
        <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setMode("in")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              mode === "in"
                ? "bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Time In (Check-In)</span>
          </button>
          <button
            type="button"
            onClick={() => setMode("out")}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              mode === "out"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>Time Out (Departure)</span>
          </button>
        </div>

        {/* Camera Selector & Audio Controls */}
        <div className="flex items-center gap-2.5">
          {cameras.length > 1 && (
            <select
              value={selectedCameraId}
              onChange={(e) => {
                const newId = e.target.value;
                setSelectedCameraId(newId);
                if (isScanning) {
                  stopCamera().then(() => startCamera(newId));
                }
              }}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
            >
              {cameras.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label || `Camera ${c.id.substring(0, 5)}...`}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? "Mute Chime" : "Enable Chime"}
            className={`p-2 rounded-xl border text-xs transition ${
              soundEnabled
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20"
                : "bg-slate-950 text-slate-500 border-slate-800 hover:text-slate-300"
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          <Button
            size="sm"
            onClick={isScanning ? stopCamera : () => startCamera()}
            variant={isScanning ? "outline" : "primary"}
            className={isScanning ? "border-red-500/50 text-red-400 hover:bg-red-500/10" : "bg-emerald-500 text-slate-950"}
            leftIcon={isScanning ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
          >
            {isScanning ? "Stop Camera" : "Start Camera"}
          </Button>
        </div>
      </div>

      {/* Main Scanner Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Camera Viewport */}
        <div className="lg:col-span-7 space-y-4">
          <Card className="glass-card border-slate-800 p-4 relative overflow-hidden bg-slate-950">
            {/* Viewport Frame */}
            <div className="relative w-full aspect-square max-h-[420px] bg-black rounded-xl overflow-hidden flex items-center justify-center border border-slate-800/80">
              <div id={elementId} className="w-full h-full" />

              {/* Laser overlay animation when active */}
              {isScanning && (
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  {/* Viewfinder box with glowing corners */}
                  <div className="relative w-72 h-72 border-2 border-emerald-500/30 rounded-2xl overflow-hidden shadow-[0_0_25px_rgba(16,185,129,0.2)]">
                    {/* Corner accents */}
                    <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                    {/* Animated laser line */}
                    <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_#10B981] animate-laser" />
                  </div>
                </div>
              )}

              {/* Idle Placeholder */}
              {!isScanning && (
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center p-6 text-center space-y-3">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Camera className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Camera Offline</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-xs">
                      Click below to activate instant camera QR scanning for member passes.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => startCamera()}
                    className="bg-emerald-500 text-slate-950 font-bold"
                    leftIcon={<Zap className="w-4 h-4" />}
                  >
                    Activate Camera
                  </Button>
                </div>
              )}

              {/* Processing Spinner Overlay */}
              {isProcessing && (
                <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center gap-3">
                  <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin" />
                  <span className="text-xs font-bold text-white tracking-wider uppercase">
                    Verifying Pass...
                  </span>
                </div>
              )}
            </div>

            {/* Camera error message */}
            {cameraError && (
              <div className="mt-3 p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-xs flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="font-bold">Camera Notice</div>
                  <div className="text-[11px] opacity-90">{cameraError}</div>
                </div>
              </div>
            )}

            {/* Quick Helper */}
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Rapid 25 FPS Hardware QR Detection Active</span>
              </span>
              <span className="font-mono text-emerald-400/80">Continuous Focus</span>
            </div>
          </Card>

          {/* Manual Entry Fallback Box */}
          <Card className="glass-card border-slate-800 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-slate-400" />
                <span>Manual Member Search (Camera Fallback)</span>
              </h4>
              <Badge variant="neutral" className="text-[10px]">
                {mode === "in" ? "Time In" : "Time Out"}
              </Badge>
            </div>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  placeholder="Enter Member Code (e.g. MEM-10025) or Athlete Email..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
              <Button
                type="submit"
                size="sm"
                isLoading={manualSubmitting}
                className={mode === "in" ? "bg-emerald-500 text-slate-950 font-bold" : "bg-amber-500 text-slate-950 font-bold"}
              >
                Verify & {mode === "in" ? "Time In" : "Time Out"}
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Scan Result Card & Recent History */}
        <div className="lg:col-span-5 space-y-4">
          {/* Real-time Result Card */}
          <Card className="glass-card border-slate-800 p-5 relative overflow-hidden">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Current Scan Verification</span>
              {scanResult && (
                <span className="font-mono text-[10px] text-slate-500">{scanResult.timestamp}</span>
              )}
            </div>

            {scanResult ? (
              <div className="space-y-4">
                {/* Status Banner */}
                <div
                  className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                    scanResult.accessGranted
                      ? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
                      : scanResult.code === "ALREADY_CHECKED_IN"
                      ? "bg-amber-950/70 border-amber-500/50 text-amber-300"
                      : "bg-red-950/70 border-red-500/50 text-red-300"
                  }`}
                >
                  {scanResult.accessGranted ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : scanResult.code === "ALREADY_CHECKED_IN" ? (
                    <Clock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  )}

                  <div className="flex-1">
                    <div className="text-xs font-black uppercase tracking-wide">
                      {scanResult.accessGranted
                        ? "Attendance Recorded Successfully!"
                        : scanResult.code === "ALREADY_CHECKED_IN"
                        ? "Already Checked In"
                        : scanResult.code === "COOLDOWN_ACTIVE"
                        ? "Cooldown Active"
                        : "Access Denied"}
                    </div>
                    <div className="text-[11px] mt-0.5 opacity-90">
                      {scanResult.message || scanResult.reason}
                    </div>
                  </div>
                </div>

                {/* Member Profile Display */}
                {scanResult.member && (
                  <div className="bg-slate-950/80 rounded-xl p-3.5 border border-slate-800/80 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-800 border-2 border-emerald-500/30 flex items-center justify-center shrink-0">
                        {scanResult.member.avatarUrl ? (
                          <img
                            src={scanResult.member.avatarUrl}
                            alt={scanResult.member.name || "Member"}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <User className="w-6 h-6 text-slate-400" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white truncate">
                          {scanResult.member.name || "Gym Athlete"}
                        </h3>
                        <div className="text-xs font-mono text-emerald-400">
                          {scanResult.member.memberCode}
                        </div>
                      </div>

                      {scanResult.member.planName && (
                        <Badge variant="emerald" className="text-[10px]">
                          {scanResult.member.planName}
                        </Badge>
                      )}
                    </div>

                    {/* Member Stats / Expiration / Points */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-850 text-xs">
                      <div className="bg-slate-900/60 p-2 rounded-lg">
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Award className="w-3 h-3 text-amber-400" />
                          <span>Reward Balance</span>
                        </div>
                        <div className="text-sm font-black text-amber-400 mt-0.5 flex items-center gap-1">
                          <span>{scanResult.member.rewardCoins || 0} pts</span>
                          {scanResult.accessGranted && (
                            <span className="text-[10px] text-emerald-400 font-bold">(+8)</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-900/60 p-2 rounded-lg">
                        <div className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-emerald-400" />
                          <span>Membership Status</span>
                        </div>
                        <div className="text-sm font-black text-white mt-0.5">
                          {scanResult.code === "MEMBERSHIP_EXPIRED" ? (
                            <span className="text-red-400">Expired</span>
                          ) : (
                            <span className="text-emerald-400">Active</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action if Already Checked In */}
                    {scanResult.canCheckOut && (
                      <div className="pt-2">
                        <Button
                          size="sm"
                          onClick={() => handleDirectCheckOut(scanResult.member?.id || scanResult.member?.memberCode || "")}
                          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold"
                          leftIcon={<LogOut className="w-4 h-4" />}
                        >
                          Check Out Member Now (Time Out)
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500 space-y-2">
                <Sparkles className="w-8 h-8 mx-auto text-slate-600" />
                <div className="text-xs">Awaiting member QR scan...</div>
                <div className="text-[10px] text-slate-600">
                  Hold QR pass in front of camera. Scanned in under a second.
                </div>
              </div>
            )}
          </Card>

          {/* Session Activity Stream */}
          <Card className="glass-card border-slate-800 p-4">
            <div className="text-xs font-bold text-white uppercase tracking-wider mb-3 flex items-center justify-between">
              <span>Current Session Activity ({scanHistory.length})</span>
              {scanHistory.length > 0 && (
                <button
                  type="button"
                  onClick={() => setScanHistory([])}
                  className="text-[10px] text-slate-500 hover:text-slate-300"
                >
                  Clear Log
                </button>
              )}
            </div>

            {scanHistory.length === 0 ? (
              <div className="py-6 text-center text-slate-600 text-xs">
                No scans recorded in this active terminal session.
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {scanHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-850 text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {item.accessGranted ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="font-bold text-white">
                          {item.member?.name || "Athlete"}
                        </span>
                        {item.member?.memberCode && (
                          <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                            ({item.member.memberCode})
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-slate-500 font-mono">
                        {item.timestamp}
                      </span>
                      <Badge
                        variant={item.accessGranted ? "emerald" : "danger"}
                        className="text-[9px] px-1.5 py-0"
                      >
                        {item.accessGranted ? "GRANTED" : "DENIED"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
