import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Header({ title, onMenuClick }) {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <header className="sticky top-0 z-40 bg-surface/95 backdrop-blur flex justify-between items-center px-4 lg:px-8 py-3 lg:py-4 w-full border-b border-outline-variant/10 font-['Inter'] text-sm antialiased">
      <div className="flex items-center gap-4">
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-2 hover:bg-surface-container rounded-lg"
        >
          <span className="material-symbols-outlined text-[#2a3439]">menu</span>
        </button>
        <span className="font-['Manrope'] font-bold text-[#2a3439] tracking-tight text-lg lg:text-xl">
          {title}
        </span>
      </div>
      <div className="flex items-center gap-2 lg:gap-6">
        <div className="hidden lg:flex items-center gap-4 text-[#566166]">
          <span className="material-symbols-outlined cursor-pointer hover:text-[#0056D2] transition-colors active:opacity-70">
            notifications
          </span>
          <span className="material-symbols-outlined cursor-pointer hover:text-[#0056D2] transition-colors active:opacity-70">
            help_outline
          </span>
        </div>
        <div className="h-6 lg:h-8 w-px bg-outline-variant opacity-20 hidden lg:block"></div>
        <div className="flex items-center gap-2 lg:gap-3 cursor-pointer group active:opacity-70">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-[#2a3439] leading-none">
              {user?.name || 'Usuario'}
            </p>
            <p className="text-[10px] text-[#566166] font-medium tracking-wider">
              {user?.role?.toUpperCase() || 'ADMIN'}
            </p>
          </div>
          <div className="w-8 lg:w-10 h-8 lg:h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm lg:text-base">
            {user?.name?.charAt(0) || 'U'}
          </div>
        </div>
      </div>
    </header>
  );
}
