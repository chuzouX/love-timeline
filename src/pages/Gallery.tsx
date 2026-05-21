import React, { useEffect, useRef, useState } from 'react';
import { deleteGalleryImage, ensureUnlocked, getGalleryImages, uploadGalleryImage, type GalleryImage } from '../api/client';

const idleDelayMs = 2600;
const autoScrollSpeed = 18;

const Gallery: React.FC = () => {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [error, setError] = useState('');
  const [canScroll, setCanScroll] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const directionRef = useRef<1 | -1>(1);
  const lastFrameTimeRef = useRef<number | null>(null);
  const pauseUntilRef = useRef(0);
  const isInteractingRef = useRef(false);

  const loadImages = async () => {
    try {
      setImages(await getGalleryImages());
      setError('');
    } catch {
      setError('无法加载相册，请确认后端已启动。');
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => void loadImages(), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const updateScrollState = () => {
      const scroller = scrollerRef.current;
      if (scroller) setCanScroll(scroller.scrollWidth > scroller.clientWidth + 8);
    };

    updateScrollState();
    window.addEventListener('resize', updateScrollState);
    return () => window.removeEventListener('resize', updateScrollState);
  }, [images, showAll]);

  const pauseAutoScroll = (duration = idleDelayMs) => {
    pauseUntilRef.current = performance.now() + duration;
  };

  useEffect(() => {
    if (showAll || !canScroll || images.length < 2) return undefined;

    const step = (timestamp: number) => {
      const scroller = scrollerRef.current;
      if (!scroller) return;

      const lastFrameTime = lastFrameTimeRef.current ?? timestamp;
      const deltaSeconds = Math.min((timestamp - lastFrameTime) / 1000, 0.05);
      lastFrameTimeRef.current = timestamp;

      if (!isInteractingRef.current && timestamp >= pauseUntilRef.current) {
        const maxScrollLeft = scroller.scrollWidth - scroller.clientWidth;
        if (maxScrollLeft > 0) {
          scroller.scrollLeft += directionRef.current * autoScrollSpeed * deltaSeconds;

          if (scroller.scrollLeft >= maxScrollLeft - 1) {
            scroller.scrollLeft = maxScrollLeft;
            directionRef.current = -1;
          } else if (scroller.scrollLeft <= 1) {
            scroller.scrollLeft = 0;
            directionRef.current = 1;
          }
        }
      }

      animationFrameRef.current = window.requestAnimationFrame(step);
    };

    pauseAutoScroll(900);
    animationFrameRef.current = window.requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current !== null) window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
      lastFrameTimeRef.current = null;
    };
  }, [canScroll, images.length, showAll]);

  const scrollGallery = (direction: -1 | 1) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    pauseAutoScroll();
    scroller.scrollBy({
      left: direction * Math.max(220, Math.floor(scroller.clientWidth * 0.82)),
      behavior: 'smooth',
    });
  };

  const openUpload = async () => {
    pauseAutoScroll();
    if (await ensureUnlocked()) fileInputRef.current?.click();
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    try {
      await uploadGalleryImage(file);
      await loadImages();
    } catch {
      setError('上传失败，请选择 12MB 以内的图片。');
    }
  };

  const removeImage = async (image: GalleryImage) => {
    if (!(await ensureUnlocked()) || !window.confirm(`删除「${image.originalName}」吗？`)) return;
    await deleteGalleryImage(image.id);
    setSelectedImage(null);
    await loadImages();
  };

  const getWidthClass = (image: GalleryImage) => {
    if (showAll) return 'w-full';
    if (image.aspectRatio >= 1.45) return 'w-[52vw] max-w-52 md:w-96 md:max-w-none';
    if (image.aspectRatio <= 0.8) return 'w-[31vw] max-w-32 md:w-48 md:max-w-none';
    return 'w-[40vw] max-w-40 md:w-64 md:max-w-none';
  };

  const openImage = (image: GalleryImage) => {
    pauseAutoScroll();
    setSelectedImage(image);
  };

  return (
    <div className="min-w-0 space-y-5 animate-fadeIn">
      <div className="flex min-w-0 flex-col justify-between gap-4 md:flex-row md:items-end">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-kuromi-purple/10 md:h-16 md:w-16">
            <img src="/assets/stickers/clean_06.png" alt="icon" className="h-10 w-10 object-contain" />
          </div>
          <div className="min-w-0 space-y-1">
            <h2 className="text-3xl font-black text-kuromi-black md:text-5xl">甜蜜画廊</h2>
            <p className="text-sm font-medium text-gray-500 sm:text-base">记录我们每一个心动瞬间</p>
          </div>
        </div>
        {error && <p className="text-sm font-bold text-red-500">{error}</p>}
        <button onClick={openUpload} className="w-full rounded-xl bg-kuromi-purple/10 px-5 py-3 font-bold text-kuromi-purple transition-all hover:bg-kuromi-purple/20 sm:w-auto">
          上传照片 +
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
      </div>

      <div className="relative min-w-0 overflow-hidden rounded-[1.5rem] p-2 glass-panel md:rounded-[2rem] md:p-6">
        {images.length === 0 ? (
          <button onClick={openUpload} className="min-h-40 w-full rounded-3xl border-2 border-dashed border-kuromi-purple/20 bg-white/40 font-black text-kuromi-purple transition-colors hover:bg-white/70 md:min-h-48">
            点击上传第一张照片
          </button>
        ) : (
          <div className="space-y-4 md:space-y-5">
            <div className="relative min-w-0">
              {!showAll && canScroll && (
                <>
                  <button
                    onClick={() => scrollGallery(-1)}
                    className="absolute left-3 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl font-black text-kuromi-purple shadow-kuromi transition-colors hover:bg-kuromi-purple hover:text-white md:flex"
                    aria-label="上一组照片"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => scrollGallery(1)}
                    className="absolute right-3 top-1/2 z-10 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-2xl font-black text-kuromi-purple shadow-kuromi transition-colors hover:bg-kuromi-purple hover:text-white md:flex"
                    aria-label="下一组照片"
                  >
                    →
                  </button>
                </>
              )}

              <div
                ref={scrollerRef}
                onPointerDown={() => {
                  isInteractingRef.current = true;
                  pauseAutoScroll();
                }}
                onPointerUp={() => {
                  isInteractingRef.current = false;
                  pauseAutoScroll();
                }}
                onPointerCancel={() => {
                  isInteractingRef.current = false;
                  pauseAutoScroll();
                }}
                onMouseEnter={() => {
                  isInteractingRef.current = true;
                }}
                onMouseLeave={() => {
                  isInteractingRef.current = false;
                  pauseAutoScroll(1200);
                }}
                onWheel={() => pauseAutoScroll()}
                className={
                  showAll
                    ? 'grid max-h-[70vh] grid-cols-2 gap-2 overflow-y-auto p-1 sm:grid-cols-3 md:grid-cols-3 md:gap-3 lg:grid-cols-4'
                    : 'flex min-w-0 snap-x snap-mandatory items-center gap-2 overflow-x-auto scroll-smooth touch-pan-x no-scrollbar md:gap-4'
                }
              >
                {images.map((image) => (
                  <button
                    key={image.id}
                    onClick={() => openImage(image)}
                    className={`${showAll ? 'w-full' : getWidthClass(image)} h-36 shrink-0 snap-center overflow-hidden rounded-2xl bg-white/60 shadow-kuromi transition-all hover:scale-[1.02] hover:shadow-kuromi-lg md:h-64`}
                    title={image.originalName}
                  >
                    <img src={image.url} alt={image.originalName} className="h-full w-full object-cover" draggable={false} />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={() => {
                  pauseAutoScroll();
                  setShowAll((value) => !value);
                }}
                className="rounded-2xl bg-kuromi-black px-8 py-3 font-black text-white shadow-xl transition-all active:scale-95"
              >
                {showAll ? '收起画廊' : '查看全部'}
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedImage && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm animate-fadeIn md:p-8" onClick={() => setSelectedImage(null)}>
          <div className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] bg-white/90 shadow-2xl glass-panel md:rounded-[2.5rem]" onClick={(event) => event.stopPropagation()}>
            <div className="flex min-w-0 items-center justify-between border-b border-gray-100 bg-white/50 px-4 py-3 md:px-6 md:py-4">
              <div className="flex min-w-0 items-center gap-3">
                <img src="/assets/stickers/clean_08.png" alt="" className="h-6 w-6 shrink-0 object-contain" />
                <span className="min-w-0 truncate font-black text-kuromi-black">{selectedImage.originalName}</span>
              </div>
              <button className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-400 transition-all hover:bg-gray-100 hover:text-kuromi-purple" onClick={() => setSelectedImage(null)}>
                ×
              </button>
            </div>

            <div className="flex min-h-0 flex-1 items-center justify-center bg-gray-50/30 p-3 md:p-8">
              <img src={selectedImage.url} alt={selectedImage.originalName} className="max-h-[68vh] max-w-full rounded-2xl object-contain shadow-xl md:max-h-[70vh]" />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-white/80 px-4 py-4 md:px-6 md:py-5">
              <button onClick={() => void removeImage(selectedImage)} className="rounded-xl bg-pink-50 px-5 py-2.5 text-sm font-black text-kuromi-pink transition-all hover:bg-kuromi-pink hover:text-white active:scale-95">
                删除
              </button>
              <button onClick={() => setSelectedImage(null)} className="rounded-xl bg-kuromi-black px-7 py-2.5 text-sm font-black text-white shadow-lg transition-all hover:bg-kuromi-purple active:scale-95">
                确定
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
