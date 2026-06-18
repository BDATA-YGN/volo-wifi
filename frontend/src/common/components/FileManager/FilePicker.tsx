"use client";
import React from "react";
import { Modal as AntModal } from "antd";
import { FileLog } from "@/types";
import FileBrowser from "./FileBrowser";
import { getFullUrl } from "./FileManagerUtils";

interface FilePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (files: FileLog[]) => void;
  multiple?: boolean;
  fileTypes?: string[];
  title?: string;
  selectedFiles?: any[];
}

const FilePicker: React.FC<FilePickerProps> = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  multiple = false, 
  fileTypes = [], 
  title = "Select Files", 
  selectedFiles = [] 
}) => {
  return (
    <AntModal
      title={title}
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={1200}
      centered
      destroyOnHidden
    >
      <FileBrowser
        mode="picker"
        multiple={multiple}
        fileTypes={fileTypes}
        onSelect={(files) => {
          const formattedFiles = files.map(f => {
            const isImg = f.mimeType?.startsWith("image/");
            const isMedia = f.type === 'audio' || f.type === 'video' || f.category === 'music' || f.category === 'music_video';
            
            let finalUrl = f.url;
            
            // 1. Remove leading slash
            if (finalUrl.startsWith("/")) {
              finalUrl = finalUrl.substring(1);
            }

            // 2. Handle bucket prefix if present
            // We strip the first segment if it's not a known category, 
            // or if we detect a bucket-like prefix followed by a category
            const parts = finalUrl.split('/');
            const categories = ['audio', 'video', 'music', 'music_video', 'assets'];
            
            if (parts.length > 1) {
              // Case 1: bucket/category/path -> category/path
              if (categories.includes(parts[1])) {
                finalUrl = parts.slice(1).join('/');
              } 
              // Case 2: category/path (but first part might be bucket if it is not in categories)
              else if (!categories.includes(parts[0]) && categories.includes(parts[1])) {
                 finalUrl = parts.slice(1).join('/');
              }
            }

            // 3. For media (audio/video), we want the folder path
            if (isMedia) {
              // If it points to a file, get the directory
              const lastSegment = parts[parts.length - 1];
              if (lastSegment && lastSegment.includes('.')) {
                // It has an extension, so it's a file. Get its directory.
                // We re-split because finalUrl might have changed in step 2
                const currentParts = finalUrl.split('/');
                if (currentParts.length > 1) {
                  finalUrl = currentParts.slice(0, -1).join('/');
                }
              }
            }

            // Image URLs should also be relative paths like mega/...
            // Removed the getFullUrl override to maintain relative paths

            return {
              ...f,
              url: finalUrl
            };
          });
          onSelect(formattedFiles as any);
          onClose();
        }}
        initialSelectedFiles={[]} // Selection by URL can be handled inside FileBrowser if needed
      />
    </AntModal>
  );
};

export default FilePicker;
