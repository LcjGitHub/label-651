import { useEffect, useRef, useState, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, RotateCw, Check } from 'lucide-react';

interface AvatarCropperProps {
  isOpen: boolean;
  imageSrc: string;
  onClose: () => void;
  onConfirm: (croppedFile: File) => void;
}

const CANVAS_SIZE = 320;

export default function AvatarCropper({
  isOpen,
  imageSrc,
  onClose,
  onConfirm,
}: AvatarCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, offsetX: 0, offsetY: 0 });
  const imageRef = useRef<HTMLImageElement | null>(null);
  const minScaleRef = useRef(1);

  const resetState = useCallback(() => {
    setImgLoaded(false);
    setScale(1);
    setRotation(0);
    setOffsetX(0);
    setOffsetY(0);
    setIsDragging(false);
    imageRef.current = null;
  }, []);

  const drawImage = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.save();
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.translate(CANVAS_SIZE / 2 + offsetX, CANVAS_SIZE / 2 + offsetY);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scale, scale);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);

    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2 - 1, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }, [scale, rotation, offsetX, offsetY]);

  useEffect(() => {
    if (!isOpen || !imageSrc) {
      resetState();
      return;
    }

    resetState();

    const img = new Image();
    img.onload = () => {
      imageRef.current = img;
      const minDim = Math.min(img.naturalWidth, img.naturalHeight);
      const initialScale = CANVAS_SIZE / minDim;
      minScaleRef.current = initialScale * 0.5;
      setScale(initialScale);
      setImgLoaded(true);
    };
    img.onerror = () => {
      setImgLoaded(false);
    };
    img.src = imageSrc;
  }, [isOpen, imageSrc, resetState]);

  useEffect(() => {
    if (imgLoaded) {
      drawImage();
    }
  }, [imgLoaded, drawImage]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!imgLoaded) return;
    e.preventDefault();
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      offsetX,
      offsetY,
    };
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      setOffsetX(dragStartRef.current.offsetX + dx);
      setOffsetY(dragStartRef.current.offsetY + dy);
    },
    [isDragging]
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!imgLoaded) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      offsetX,
      offsetY,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const dx = touch.clientX - dragStartRef.current.x;
    const dy = touch.clientY - dragStartRef.current.y;
    setOffsetX(dragStartRef.current.offsetX + dx);
    setOffsetY(dragStartRef.current.offsetY + dy);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setScale((prev) => Math.min(prev * 1.2, prev + 0.3, 5));
  };

  const handleZoomOut = () => {
    setScale((prev) => Math.max(prev / 1.2, prev - 0.2, minScaleRef.current));
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  const handleConfirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageRef.current) return;

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], 'avatar-cropped.png', {
          type: 'image/png',
        });
        onConfirm(croppedFile);
      },
      'image/png',
      0.95
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4
                    animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">裁剪头像</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors duration-150"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5">
          <div
            ref={containerRef}
            className="relative mx-auto bg-gray-100 rounded-full overflow-hidden select-none cursor-move"
            style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
          >
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              className="block"
            />
            {!imgLoaded && (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm text-gray-500">图片加载中...</span>
              </div>
            )}
          </div>

          <div className="flex items-center justify-center gap-3 mt-5">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={!imgLoaded}
              className="p-2.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200
                         transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="缩小"
            >
              <ZoomOut size={18} />
            </button>
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={!imgLoaded}
              className="p-2.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200
                         transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="放大"
            >
              <ZoomIn size={18} />
            </button>
            <button
              type="button"
              onClick={handleRotate}
              disabled={!imgLoaded}
              className="p-2.5 text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200
                         transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              title="旋转 90°"
            >
              <RotateCw size={18} />
            </button>
          </div>

          <p className="text-xs text-gray-400 text-center mt-3">
            拖动图片调整位置 · 滚轮缩放 · 确认后生成圆形头像
          </p>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t border-gray-100 bg-gray-50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300
                       rounded-lg hover:bg-gray-50 transition-colors duration-150"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!imgLoaded}
            className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600
                       rounded-lg hover:bg-blue-700 transition-colors duration-150
                       disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
          >
            <Check size={16} />
            确认裁剪
          </button>
        </div>
      </div>
    </div>
  );
}
