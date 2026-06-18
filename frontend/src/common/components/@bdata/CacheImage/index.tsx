"use client";

import Image from 'next/image';
import { useState, useEffect } from 'react';

interface CacheImageProps {
  imageUrl?: string | null;
  alt?: string;
  className?: string; // Ability to pass custom styles
  width?: number;
  height?: number;
}

const CacheImage = ({ imageUrl, alt = "Avatar", className, width = 40, height = 40 }: CacheImageProps) => {
  const fallback = "/assets/fav.svg";
  const [imgSrc, setImgSrc] = useState<string>(imageUrl || fallback);

  useEffect(() => {
    setImgSrc(imageUrl || fallback);
  }, [imageUrl]);

  return (
    <Image
      src={imgSrc}
      alt={alt}
      width={width}
      height={height}
      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      className={className}
      onError={() => setImgSrc(fallback)}
      loading="lazy"
      unoptimized
    />
  );
};

export default CacheImage;