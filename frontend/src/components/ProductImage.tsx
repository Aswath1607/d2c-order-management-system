import { useEffect, useState } from 'react';

interface ProductImageProps {
  src?: string | null;
  alt: string;
  className?: string;
}

export default function ProductImage({ src, alt, className = '' }: ProductImageProps) {
  const [failed, setFailed] = useState(!src);

  useEffect(() => {
    setFailed(!src);
  }, [src]);

  if (failed) {
    return (
      <div className={`flex items-center justify-center bg-slate-100 text-sm font-medium text-slate-400 ${className}`}>
        Image unavailable
      </div>
    );
  }

  return <img src={src ?? undefined} alt={alt} onError={() => setFailed(true)} className={`object-cover ${className}`} />;
}
