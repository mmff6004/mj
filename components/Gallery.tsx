import React from 'react';
import type { GalleryItem } from '../types';
import { EditIcon } from './icons/EditIcon';
import { PlayIcon } from './icons/PlayIcon';

interface GalleryProps {
  images: GalleryItem[];
  onImageSelect: (item: GalleryItem) => void;
}

export const Gallery: React.FC<GalleryProps> = ({ images, onImageSelect }) => {
  if (images.length === 0) {
    return null;
  }

  return (
    <div className="mt-12 pt-8 border-t-2 border-white/10">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-6 text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400">
        Your Creations Gallery
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {images.map((item) => (
          <div 
            key={item.id}
            className="relative group aspect-square cursor-pointer overflow-hidden rounded-lg shadow-lg transition-all duration-300 hover:shadow-orange-500/30"
            onClick={() => onImageSelect(item)}
            role="button"
            tabIndex={0}
            aria-label={`Select ${item.type} to view or edit`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onImageSelect(item); }}
          >
            <img
              src={`data:image/png;base64,${item.editedImageBase64}`}
              alt="A generated item in the gallery"
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
             <div className="absolute inset-0 ring-1 ring-inset ring-white/10 group-hover:ring-orange-500 rounded-lg transition-all duration-300"></div>
            {item.type === 'video' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-opacity duration-300 group-hover:opacity-0">
                <PlayIcon className="w-12 h-12 text-white/80 drop-shadow-lg" />
              </div>
            )}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="transform transition-transform duration-300 group-hover:scale-100 scale-90">
                {item.type === 'video' ? <PlayIcon className="w-8 h-8 text-white mb-2" /> : <EditIcon className="w-8 h-8 text-white mb-2" />}
                <span className="text-white text-sm font-semibold text-center px-1">
                  {item.type === 'video' ? 'View Video' : 'Continue Editing'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};