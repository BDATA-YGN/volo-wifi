"use client";

export const Loading = () => {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center backdrop-blur-md bg-white/90 dark:bg-neutral-900">
      <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
        {/* Spinner */}
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
          <div className="w-12 h-12 rounded-full border-4 border-transparent border-t-orange-500 border-r-orange-400 animate-spin absolute top-0 left-0"></div>
        </div>
      
      </div>
    </div>
  );
};