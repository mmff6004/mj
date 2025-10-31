import React from 'react';

export const Header: React.FC = () => {
  return (
    <header className="text-center py-4">
      <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-yellow-400 tracking-tight">
        MJ AI
      </h1>
      <p className="mt-2 text-lg text-gray-400 max-w-2xl mx-auto">
        Bring your creative visions to life with the power of generative AI.
      </p>
    </header>
  );
};