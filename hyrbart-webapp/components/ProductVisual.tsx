import Image from 'next/image';

export default function ProductVisual({
  kind = 'cleaner',
  accent = '#f4c300',
  large = false,
  imageSrc,
  imageAlt = 'Produktbild',
}: {
  kind?: string;
  accent?: string;
  large?: boolean;
  imageSrc?: string;
  imageAlt?: string;
}) {
  if (imageSrc) {
    const sanityImage = imageSrc.includes('cdn.sanity.io');

    return (
      <div className={`productVisual productPhotoVisual ${sanityImage ? 'sanityProductVisual' : ''} ${large ? 'large' : ''}`}>
        <Image
          src={imageSrc}
          alt={imageAlt}
          fill
          sizes={large ? '(max-width: 760px) 90vw, 680px' : '(max-width: 760px) 38vw, 280px'}
          className={`productPhoto ${sanityImage ? 'sanityProductImage' : ''}`}
          priority={large}
        />
      </div>
    );
  }

  return (
    <div className={`productVisual ${large ? 'large' : ''}`} aria-label="Produktbild placeholder">
      <div className="machineBody" style={{ ['--machine-accent' as string]: accent }}>
        <span className="machineTop" />
        <span className="machineAccent" />
        <span className="machineWheel w1" /><span className="machineWheel w2" />
        {kind === 'saw' && <span className="sawBlade" />}
      </div>
    </div>
  );
}
