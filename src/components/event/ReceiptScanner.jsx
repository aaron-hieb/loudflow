import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RotateCw, Crop, Check } from "lucide-react";
import { jsPDF } from "jspdf";

const HANDLE_RADIUS = 14;

// Auto-detect receipt bounds by sampling the image for the largest bright rectangular region
function autoDetectBounds(img, canvasW, canvasH) {
  // Use an offscreen canvas to sample pixels
  const offscreen = document.createElement("canvas");
  const sampleW = 200, sampleH = Math.round(200 * canvasH / canvasW);
  offscreen.width = sampleW;
  offscreen.height = sampleH;
  const ctx = offscreen.getContext("2d");
  ctx.drawImage(img, 0, 0, sampleW, sampleH);
  const data = ctx.getImageData(0, 0, sampleW, sampleH).data;

  // Build brightness map
  const bright = new Uint8Array(sampleW * sampleH);
  for (let i = 0; i < sampleW * sampleH; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2];
    bright[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // Find bounding box of pixels brighter than threshold (assumes receipt is lighter than background)
  const threshold = 180;
  let minX = sampleW, maxX = 0, minY = sampleH, maxY = 0;
  for (let y = 0; y < sampleH; y++) {
    for (let x = 0; x < sampleW; x++) {
      if (bright[y * sampleW + x] > threshold) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // Fallback: 5% inset if detection fails or covers almost everything
  const fW = maxX - minX, fH = maxY - minY;
  const pad5W = sampleW * 0.05, pad5H = sampleH * 0.05;
  if (fW < sampleW * 0.3 || fH < sampleH * 0.3 || fW > sampleW * 0.95) {
    minX = pad5W; maxX = sampleW - pad5W;
    minY = pad5H; maxY = sampleH - pad5H;
  }

  // Scale back to canvas dimensions
  const scaleX = canvasW / sampleW, scaleY = canvasH / sampleH;
  return {
    tl: { x: minX * scaleX, y: minY * scaleY },
    tr: { x: maxX * scaleX, y: minY * scaleY },
    br: { x: maxX * scaleX, y: maxY * scaleY },
    bl: { x: minX * scaleX, y: maxY * scaleY },
  };
}

function drawOverlay(canvas, img, corners) {
  if (!canvas || !img) return;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  // Dim outside polygon
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "destination-out";
  ctx.beginPath();
  ctx.moveTo(corners.tl.x, corners.tl.y);
  ctx.lineTo(corners.tr.x, corners.tr.y);
  ctx.lineTo(corners.br.x, corners.br.y);
  ctx.lineTo(corners.bl.x, corners.bl.y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Redraw image inside polygon
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(corners.tl.x, corners.tl.y);
  ctx.lineTo(corners.tr.x, corners.tr.y);
  ctx.lineTo(corners.br.x, corners.br.y);
  ctx.lineTo(corners.bl.x, corners.bl.y);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  // Draw border
  ctx.strokeStyle = "#ff6b00";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(corners.tl.x, corners.tl.y);
  ctx.lineTo(corners.tr.x, corners.tr.y);
  ctx.lineTo(corners.br.x, corners.br.y);
  ctx.lineTo(corners.bl.x, corners.bl.y);
  ctx.closePath();
  ctx.stroke();

  // Draw corner handles
  const handleKeys = ["tl", "tr", "br", "bl"];
  handleKeys.forEach((key) => {
    const c = corners[key];
    ctx.beginPath();
    ctx.arc(c.x, c.y, HANDLE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = "#ff6b00";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function hitCorner(corners, x, y) {
  const keys = ["tl", "tr", "br", "bl"];
  for (const key of keys) {
    const c = corners[key];
    const dx = c.x - x, dy = c.y - y;
    if (Math.sqrt(dx * dx + dy * dy) <= HANDLE_RADIUS * 1.5) return key;
  }
  return null;
}

export default function ReceiptScanner({ onScanned, onClose }) {
  const [step, setStep] = useState("capture");
  const [imageSrc, setImageSrc] = useState(null);
  const [corners, setCorners] = useState(null);
  const [draggingCorner, setDraggingCorner] = useState(null);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);
  const cornersRef = useRef(null);

  // Keep ref in sync for event handlers
  useEffect(() => { cornersRef.current = corners; }, [corners]);

  function handleFileCapture(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageSrc(ev.target.result);
      setStep("crop");
      setCorners(null);
    };
    reader.readAsDataURL(file);
  }

  function handleImgLoad() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const maxW = Math.min(img.naturalWidth, 800);
    const scale = maxW / img.naturalWidth;
    canvas.width = maxW;
    canvas.height = img.naturalHeight * scale;

    const detected = autoDetectBounds(img, canvas.width, canvas.height);
    setCorners(detected);
    cornersRef.current = detected;
    drawOverlay(canvas, img, detected);
  }

  // Redraw whenever corners change
  useEffect(() => {
    if (corners && canvasRef.current && imgRef.current) {
      drawOverlay(canvasRef.current, imgRef.current, corners);
    }
  }, [corners]);

  function getPos(e) {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  const onPointerDown = useCallback((e) => {
    e.preventDefault();
    if (!cornersRef.current) return;
    const pos = getPos(e);
    const hit = hitCorner(cornersRef.current, pos.x, pos.y);
    if (hit) setDraggingCorner(hit);
  }, []);

  const onPointerMove = useCallback((e) => {
    e.preventDefault();
    if (!draggingCorner || !cornersRef.current) return;
    const pos = getPos(e);
    const updated = { ...cornersRef.current, [draggingCorner]: pos };
    setCorners(updated);
  }, [draggingCorner]);

  const onPointerUp = useCallback((e) => {
    e.preventDefault();
    setDraggingCorner(null);
  }, []);

  async function handleConfirmCrop() {
    setStep("processing");
    const canvas = canvasRef.current;
    const img = imgRef.current;
    const c = cornersRef.current;

    // Bounding box of the four corners (for simple rect crop)
    const scaleX = img.naturalWidth / canvas.width;
    const scaleY = img.naturalHeight / canvas.height;

    const xs = [c.tl.x, c.tr.x, c.br.x, c.bl.x];
    const ys = [c.tl.y, c.tr.y, c.br.y, c.bl.y];
    const minX = Math.min(...xs) * scaleX;
    const minY = Math.min(...ys) * scaleY;
    const maxX = Math.max(...xs) * scaleX;
    const maxY = Math.max(...ys) * scaleY;
    const sw = maxX - minX, sh = maxY - minY;

    const srcCanvas = document.createElement("canvas");
    srcCanvas.width = sw;
    srcCanvas.height = sh;
    srcCanvas.getContext("2d").drawImage(img, minX, minY, sw, sh, 0, 0, sw, sh);

    const dataUrl = srcCanvas.toDataURL("image/jpeg", 0.92);
    const orientation = sw > sh ? "landscape" : "portrait";
    const pdf = new jsPDF({ orientation, unit: "px", format: [sw, sh] });
    pdf.addImage(dataUrl, "JPEG", 0, 0, sw, sh);
    const pdfFile = new File([pdf.output("blob")], "receipt.pdf", { type: "application/pdf" });
    onScanned(pdfFile);
  }

  function retake() {
    setImageSrc(null);
    setCorners(null);
    setStep("capture");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {step === "capture" && "Scan Receipt"}
            {step === "crop" && "Adjust Receipt Corners"}
            {step === "processing" && "Processing..."}
          </DialogTitle>
        </DialogHeader>

        {step === "capture" && (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-sm text-muted-foreground text-center">Take a photo or choose an image of your receipt.</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileCapture}
            />
            <Button onClick={() => fileInputRef.current.click()} className="gap-2">
              Open Camera
            </Button>
          </div>
        )}

        {step === "crop" && imageSrc && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              The receipt area was auto-detected. Drag the <span className="text-primary font-medium">orange corner handles</span> to adjust if needed.
            </p>
            <div className="relative overflow-auto border rounded-lg bg-muted">
              <img
                ref={imgRef}
                src={imageSrc}
                alt="receipt"
                className="hidden"
                onLoad={handleImgLoad}
              />
              <canvas
                ref={canvasRef}
                className="touch-none w-full"
                style={{ cursor: draggingCorner ? "grabbing" : "default", display: "block" }}
                onMouseDown={onPointerDown}
                onMouseMove={onPointerMove}
                onMouseUp={onPointerUp}
                onTouchStart={onPointerDown}
                onTouchMove={onPointerMove}
                onTouchEnd={onPointerUp}
              />
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="outline" size="sm" onClick={retake} className="gap-1.5">
                <RotateCw className="h-3.5 w-3.5" /> Retake
              </Button>
              <Button size="sm" onClick={handleConfirmCrop} disabled={!corners} className="gap-1.5">
                <Check className="h-3.5 w-3.5" /> Confirm & Save
              </Button>
            </div>
          </div>
        )}

        {step === "processing" && (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Converting to PDF...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}