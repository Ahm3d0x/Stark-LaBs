import React from 'react';
import { StarkLabsLogo } from './StarkLabsLogo';
import { PWAInstallButton } from './PWAInstallButton';

export type AppView = 'home' | 'products';

interface NavbarProps {
  activeView: AppView;
  onChangeView: (view: AppView) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeView,
  onChangeView,
}) => {
  const navItems: { id: AppView; label: string }[] = [
    { id: 'home', label: 'الرئيسية' },
    { id: 'products', label: 'المنتجات' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full max-w-full overflow-x-hidden bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6 lg:px-8 h-16 sm:h-20">
        {/* Prominent StarkLaBs Brand Logo & Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            onChangeView('home');
          }}
          aria-label="StarkLaBs — الرئيسية"
          className="hover:opacity-95 transition-opacity shrink-0"
        >
          <StarkLabsLogo size="sm" />
        </a>

        {/* Clean Single-Row Navigation Switcher + Mobile Install Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <PWAInstallButton />

          <nav
            aria-label="التنقل الرئيسي"
            className="flex items-center gap-1 p-1 bg-zinc-900 border border-zinc-800 rounded-xl shrink-0"
          >
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onChangeView(item.id)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  activeView === item.id
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
};
