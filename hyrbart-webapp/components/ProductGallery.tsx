'use client';

import Image from 'next/image';
import { useRef, useState } from 'react';
import { ProductBadgeLabel } from '@/components/ProductPricing';

type ProductGalleryProps = {
  images: string[];
  alt: string;
  badge?: 'popular' | 'very-popular';
  locale: string;
};

export default function ProductGallery({
  images,
  alt,
  badge,
  locale,
}: ProductGalleryProps) {
  const cleanImages = images.filter(Boolean);
  const hasMultiple = cleanImages.length > 1;
  const [activeIndex, setActiveIndex] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);

  const goTo = (index: number) => {
    if (!trackRef.current || cleanImages.length === 0) return;

    const nextIndex = (index + cleanImages.length) % cleanImages.length;

    trackRef.current.scrollTo({
      left: trackRef.current.clientWidth * nextIndex,
      behavior: 'smooth',
    });

    setActiveIndex(nextIndex);
  };

  const handleScroll = () => {
    if (!trackRef.current) return;

    const width = trackRef.current.clientWidth;
    if (!width) return;

    const nextIndex = Math.round(trackRef.current.scrollLeft / width);
    if (nextIndex !== activeIndex) setActiveIndex(nextIndex);
  };

  if (cleanImages.length === 0) return null;

  return (
    <div
      className={`productGallery ${hasMultiple ? 'hasMultiple' : 'singleImage'}`}
      style={
        hasMultiple
          ? {
              background: 'transparent',
              border: '0',
              borderRadius: 0,
              boxShadow: 'none',
            }
          : undefined
      }
      aria-label={locale === 'en' ? 'Product images' : 'Produktbilder'}
    >
      <div
        ref={trackRef}
        className="productGalleryTrack"
        onScroll={handleScroll}
      >
        {cleanImages.map((src, index) => (
          <div className="productGallerySlide" key={`${src}-${index}`}>
            <Image
              src={src}
              alt={index === 0 ? alt : `${alt} – ${index + 1}`}
              fill
              sizes="(max-width: 760px) 100vw, 760px"
              className="productGalleryImage"
              priority={index === 0}
            />
          </div>
        ))}
      </div>

      <ProductBadgeLabel badge={badge} locale={locale} large />

      {hasMultiple && (
        <>
          <button
            type="button"
            className="productGalleryArrow productGalleryArrowPrev"
            onClick={() => goTo(activeIndex - 1)}
            aria-label={locale === 'en' ? 'Previous image' : 'Föregående bild'}
          >
            ‹
          </button>

          <button
            type="button"
            className="productGalleryArrow productGalleryArrowNext"
            onClick={() => goTo(activeIndex + 1)}
            aria-label={locale === 'en' ? 'Next image' : 'Nästa bild'}
          >
            ›
          </button>

          <div
            className="productGalleryDots"
            aria-label={
              locale === 'en'
                ? `Image ${activeIndex + 1} of ${cleanImages.length}`
                : `Bild ${activeIndex + 1} av ${cleanImages.length}`
            }
          >
            {cleanImages.map((_, index) => (
              <button
                type="button"
                key={index}
                className={index === activeIndex ? 'active' : ''}
                onClick={() => goTo(index)}
                aria-label={
                  locale === 'en'
                    ? `Show image ${index + 1}`
                    : `Visa bild ${index + 1}`
                }
                aria-current={index === activeIndex ? 'true' : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
