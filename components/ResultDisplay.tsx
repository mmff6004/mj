
import React from 'react';
import type { EditResult } from '../types';
import { LoadingSpinner } from './LoadingSpinner';
import { DownloadIcon } from './icons/DownloadIcon';

interface ResultDisplayProps {
  isLoading: boolean;
  error: string | null;
  result: EditResult | null;
  originalImagePreview: string | null;
  mode: 'edit' | 'generate' | 'video';
  loadingText?: string;
  filterStyle?: React.CSSProperties;
}

export const ResultDisplay: React.FC<ResultDisplayProps> = ({ isLoading, error, result, originalImagePreview, mode, loadingText, filterStyle }) => {
  const handleDownload = () => {
    if (!result) return;
    const link = document.createElement('a');
    if (result.videoUrl) {
      link.href = result.videoUrl;
      link.download = `generated-video-${Date.now()}.mp4`;
    } else {
      link.href = `data:${result.mimeType || 'image/png'};base64,${result.editedImageBase64}`;
      link.download = `generated-image-${Date.now()}.png`;
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-md flex flex-col items-center justify-center h-full space-y-4 rounded-lg z-10">
          <LoadingSpinner />
          <p className="text-gray-300 text-center px-4">{loadingText || 'AI is thinking...'}</p>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-center bg-red-900/30 border border-red-500/50 p-4 rounded-lg">
          <p className="font-semibold text-red-300">An Error Occurred</p>
          <p className="text-sm text-red-400/90 mt-2 whitespace-pre-wrap">{error}</p>
        </div>
      );
    }
    
    if (result) {
      return (
        <div className="space-y-4 relative group w-full h-full flex flex-col items-center justify-center">
          {result.videoUrl ? (
             <video 
                src={result.videoUrl} 
                controls 
                className="w-full max-w-full max-h-[75vh] h-auto object-contain rounded-lg shadow-2xl" 
             />
          ) : (
            <img 
              src={`data:${result.mimeType || 'image/png'};base64,${result.editedImageBase64}`} 
              alt="Generated result" 
              className="w-full h-auto object-contain rounded-lg shadow-2xl"
              style={filterStyle}
            />
          )}
           <button
              onClick={handleDownload}
              className="absolute top-4 right-4 bg-black/50 backdrop-blur-sm text-gray-100 p-3 rounded-full hover:bg-orange-600/80 focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all duration-300 opacity-0 group-hover:opacity-100"
              aria-label="Download media"
              title="Download"
            >
              <DownloadIcon className="w-6 h-6" />
            </button>
          {result.editedText && (
            <div className="p-4 bg-black/30 backdrop-blur-sm rounded-lg border border-white/10 w-full">
              <p className="text-sm text-gray-300 italic">
                {result.editedText}
              </p>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
        <p className="text-lg">
          {mode === 'video' ? 'Your generated video will appear here.' : 'Your generated image will appear here.'}
        </p>
        {mode === 'edit' ? (
          <p className="text-sm mt-2">Upload an image and provide a prompt to get started.</p>
        ) : (
          <p className="text-sm mt-2">Describe the {mode} you want to create in the prompt box.</p>
        )}
      </div>
    );
  };
  
  const loadingBgStyle = isLoading && (mode === 'edit' || mode === 'video') && originalImagePreview ? {
    backgroundImage: `url(${originalImagePreview})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  } : {};

  return (
    <div 
      className="relative w-full h-full min-h-[30rem] flex justify-center items-center p-2 bg-white/5 border border-white/10 rounded-xl overflow-hidden"
      style={loadingBgStyle}
    >
      {/* Blurred Background Div */}
      {isLoading && (mode === 'edit' || mode === 'video') && originalImagePreview && (
        <div className="absolute inset-0 backdrop-blur-lg"></div>
      )}
      
      {/* Content */}
      <div className="relative z-10 w-full h-full flex justify-center items-center">
         {renderContent()}
      </div>
    </div>
  );
};
