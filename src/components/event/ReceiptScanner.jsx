import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, RotateCw, Crop, Check } from "lucide-react";
import { jsPDF } from "jspdf";

export default function ReceiptScanner({ onScanned, onClose }) {
  const [step, setStep] = useState("capture"); // capture | crop | processing
  const [imageSrc, setImageSrc] = useState(null);
  const [cropStart, setCropStart] = useState(null);
  const [cropRect, setCropRect] = useState(null);
  const [dragging, setDragging] = useState(false);
  const canvasRef = useRef(null);
  const imgRef = useRef(null);
  const fileInputRef = useRef(null);

  function handleFileCapture(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImageSrc(ev.target.result);
      setStep("crop");
      setCropRect(null);
    };
    reader.readAsDataURL(file);
  }

  function getRelativePos(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  const onMouseDown = useCallback((e) => {
    e.preventDefault();
    const pos = getRelativePos(e, canvasRef.current);
    setCropStart(pos);
    setCropRect(null);
    setDragging(true);
  }, []);

  const onMouseMove = useCallback((e) => {
    if (!dragging || !cropStart) return;
    e.preventDefault();
    const pos = getRelativePos(e, canvasRef.current);
    setCropRect({
      x: Math.min(cropStart.x, pos.x),
      y: Math.min(cropStart.y, pos.y),
      w: Math.abs(pos.x - cropStart.x),
      h: Math.abs(pos.y - cropStart.y),
    });
  }, [dragging, cropStart]);

  const onMouseUp = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  function drawCanvas() {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
    if (cropRect && cropRect.w > 5 && cropRect.h > 5) {
      // dim outside crop
      ctx.fillStyle = "rgba(0,0,0,0.45)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.clearRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      ctx.drawImage(imgRef.current, cropRect.x, cropRect.y, cropRect.w, cropRect.h, cropRect.x, cropRect.y, cropRect.w, cropRect.h);
      // border
      ctx.strokeStyle = "#ff6b00";
      ctx.lineWidth = 2;
      ctx.strokeRect(cropRect.x, cropRect.y, cropRect.w, cropRect.h);
    }
  }

  function handleImgLoad() {
    const canvas = canvasRef.current;
    if (!canvas || !imgRef.current) return;
    const maxW = Math.min(imgRef.current.naturalWidth, 800);
    const scale = maxW / imgRef.current.naturalWidth;
    canvas.width = maxW;
    canvas.height = imgRef.current.naturalHeight * scale;
    drawCanvas();
  }

  // re-draw whenever cropRect changes
  useCallback(() => { drawCanvas(); }, [cropRect]);

  async function handleConfirmCrop() {
    setStep("processing");
    const canvas = canvasRef.current;
    const img = imgRef.current;

    // Build a temp canvas with just the cropped region (or full image if no crop)
    const srcCanvas = document.createElement("canvas");
    const srcCtx = srcCanvas.getContext("2d");

    let sx, sy, sw, sh;
    if (cropRect && cropRect.w > 10 && cropRect.h > 10) {
      const scaleX = img.naturalWidth / canvas.width;
      const scaleY = img.naturalHeight / canvas.height;
      sx = cropRect.x * scaleX;
      sy = cropRect.y * scaleY;
      sw = cropRect.w * scaleX;
      sh = cropRect.h * scaleY;
    } else {
      sx = 0; sy = 0; sw = img.naturalWidth; sh = img.naturalHeight;
    }

    srcCanvas.width = sw;
    srcCanvas.height = sh;
    srcCtx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    const dataUrl = srcCanvas.toDataURL("image/jpeg", 0.92);

    // Convert to PDF
    const orientation = sw > sh ? "landscape" : "portrait";
    const pdf = new jsPDF({ orientation, unit: "px", format: [sw, sh] });
    pdf.addImage(dataUrl, "JPEG", 0, 0, sw, sh);
    const pdfBlob = pdf.output("blob");
    const pdfFile = new File([pdfBlob], "receipt.pdf", { type: "application/pdf" });

    onScanned(pdfFile);
  }

  function retake() {
    setImageSrc(null);
    setCropRect(null);
    setStep("capture");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {step === "capture" && "Scan Receipt"}
            {step === "crop" && "Crop Receipt"}
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
            <p className="text-xs text-muted-foreground">Drag to select the receipt area, then confirm. Skip to use full image.</p>
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
                style={{ cursor: "crosshair", display: "block" }}
                onMouseDown={onMouseDown}
                onMouseMove={(e) => { onMouseMove(e); drawCanvas(); }}
                onMouseUp={onMouseUp}
                onTouchStart={onMouseDown}
                onTouchMove={(e) => { onMouseMove(e); drawCanvas(); }}
                onTouchEnd={onMouseUp}
              />
            </div>
            <div className="flex justify-between gap-2">
              <Button variant="outline" size="sm" onClick={retake} className="gap-1.5">
                <RotateCw className="h-3.5 w-3.5" /> Retake
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { setCropRect(null); handleConfirmCrop(); }} className="gap-1.5">
                  <Crop className="h-3.5 w-3.5" /> Use Full Image
                </Button>
                <Button size="sm" onClick={handleConfirmCrop} disabled={!cropRect || cropRect.w < 10} className="gap-1.5">
                  <Check className="h-3.5 w-3.5" /> Confirm Crop
                </Button>
              </div>
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