import React from "react";

interface MobileContainerProps {
  children: React.ReactNode;
}

export const MobileContainer: React.FC<MobileContainerProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-neutral-950 flex justify-center selection:bg-amber-500 selection:text-black">
      <div className="w-full max-w-md min-h-screen bg-[#0b0f19] text-white flex flex-col relative shadow-2xl border-x border-slate-800">
        {children}
      </div>
    </div>
  );
};
