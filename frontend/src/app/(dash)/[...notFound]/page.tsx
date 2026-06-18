"use client";
import React, { useState, useEffect } from 'react';
import { Home, Search, RefreshCw, ArrowLeft } from 'lucide-react';

const NotFoundPage: React.FC = () => {
  const handleGoHome = () => {
    window.location.href = '/';
  };

  const handleGoBack = () => {
    window.history.back();
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <div className="h-[80vh] flex flex-col items-center justify-center relative overflow-hidden">
      <h1 className="text-6xl font-extrabold text-orange-600">404</h1>
      <button
        onClick={handleGoHome}
        className="mt-6 px-6 py-2 bg-orange-500 text-white font-semibold rounded-lg shadow-md hover:bg-orange-600 transition-colors"
      >
        Go to Home
      </button>
    </div>
  );
};

export default NotFoundPage;