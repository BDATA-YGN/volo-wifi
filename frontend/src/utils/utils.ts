import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { useState } from 'react';
import { GetProp, message, UploadProps } from "antd";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const useAsyncHandler = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAsync = async <T>(asyncFn: () => Promise<T>): Promise<T | any> => {
    setLoading(true);
    setError(null);

    try {
      const result = await asyncFn();
      setLoading(false);
      return result;
    }catch (error: any){
      setError(error.errorMessage);
      setLoading(false);
      throw error;
    }
  };

  return { loading, error, handleAsync, setError };
}

export const convertPathToName = (path: string): string => {
  // Remove leading slash, if any
  const cleanPath = path.startsWith("/") ? path.slice(1) : path;

  // Capitalize the first letter and return the rest unchanged
  return cleanPath.charAt(0).toUpperCase() + cleanPath.slice(1);
}


export const formatFileSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}


// Helper function to transform enum into an array of objects with key & label
export const getEnumOptions = <T extends object>(enumObj: T) => {
  return Object.values(enumObj).map((value) => ({
    key: value,
    label: value.charAt(0).toUpperCase() + value.slice(1).toLowerCase(),
  }));
};


export type FileType = Parameters<GetProp<UploadProps, 'beforeUpload'>>[0];

export const getBase64 = (img: FileType, callback: (url: string) => void) => {
  const reader = new FileReader();
  reader.addEventListener('load', () => callback(reader.result as string));
  reader.readAsDataURL(img);
};

export const beforeUpload = (file: FileType) => {
  const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
  if (!isJpgOrPng) {
    message.error('You can only upload JPG/PNG file!');
  }
  const isLt2M = file.size / 1024 / 1024 < 2;
  if (!isLt2M) {
    message.error('Image must smaller than 2MB!');
  }
  return isJpgOrPng && isLt2M;
};
