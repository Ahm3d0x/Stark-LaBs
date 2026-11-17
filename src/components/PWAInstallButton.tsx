import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, MoreVertical, X, WifiOff } from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';
import { StarkLabsLogo } from './StarkLabsLogo';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [guideTab, setGuideTab] = useState<'android' | 'ios'>(() =>
    isIOS ? 'ios' : 'android'
  );

  // Hide automatically if the app is already installed in standalone mode
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
    } else {
      setGuideTab(isIOS ? 'ios' : 'android');
      setShowGuideModal(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        aria-label="تثبيت تطبيق StarkLaBs على الموبايل"
        className="px-2.5 sm:px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-amber-500/50 text-amber-400 hover:text-amber-300 text-xs font-extrabold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer shadow-sm"
      >
        <Download className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>تثبيت التطبيق</span>
      </button>

      {showGuideModal && (
        <div
          onClick={() => setShowGuideModal(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-modal-title"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-2xl space-y-4 text-right"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-2 border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    id="pwa-install-modal-title"
                    className="text-sm sm:text-base font-extrabold text-zinc-100"
                  >
                    تثبيت تطبيق StarkLaBs على الموبايل
                  </h3>
                  <p className="text-[11px] text-zinc-400">
                    ثبّت المتجر على الشاشة الرئيسية لتصفح أسرع وبدون متصفح
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="إغلاق نافذة التثبيت"
                className="p-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-zinc-400 hover:text-zinc-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Platform Switcher Tabs (Android vs iPhone/iOS) */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-zinc-950 border border-zinc-800 rounded-xl">
              <button
                type="button"
                onClick={() => setGuideTab('android')}
                className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                  guideTab === 'android'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                أندرويد (Android)
              </button>
              <button
                type="button"
                onClick={() => setGuideTab('ios')}
                className={`py-2 px-3 rounded-lg text-xs font-extrabold transition-colors cursor-pointer ${
                  guideTab === 'ios'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'text-zinc-400 hover:text-zinc-100'
                }`}
              >
                آيفون (iPhone / iOS)
              </button>
            </div>

            {/* Step-by-Step Instructions */}
            {guideTab === 'android' ? (
              <div className="bg-zinc-950 border border-zinc-800/90 rounded-xl p-4 space-y-3 text-xs text-zinc-200">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-black flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <p className="leading-relaxed">
                    افتح رابط الموقع في متصفح <strong>Google Chrome</strong> على هاتفك، ثم اضغط على قائمة المتصفح{' '}
                    <MoreVertical className="w-3.5 h-3.5 inline text-amber-400 mx-0.5" /> أعلى الشاشة.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-black flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <p className="leading-relaxed">
                    اختر <strong>«تثبيت التطبيق» (Install App)</strong> أو{' '}
                    <strong>«الإضافة إلى الشاشة الرئيسية»</strong> ليظهر تطبيق{' '}
                    <span className="text-amber-400 font-bold">StarkLaBs</span> فوراً على هاتفك.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-950 border border-zinc-800/90 rounded-xl p-4 space-y-3 text-xs text-zinc-200">
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-black flex items-center justify-center shrink-0 text-[11px]">
                    1
                  </span>
                  <p className="leading-relaxed">
                    افتح الموقع في متصفح <strong>Safari</strong> ثم اضغط على زر{' '}
                    <strong>المشاركة (Share)</strong>{' '}
                    <Share className="w-3.5 h-3.5 inline text-amber-400 mx-0.5" /> في الشريط السفلي.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-zinc-950 font-black flex items-center justify-center shrink-0 text-[11px]">
                    2
                  </span>
                  <p className="leading-relaxed">
                    مرر للأسفل واختر <strong>«إضافة إلى الشاشة الرئيسية» (Add to Home Screen)</strong>{' '}
                    <PlusSquare className="w-3.5 h-3.5 inline text-amber-400 mx-0.5" /> ثم اضغط <strong>إضافة</strong>.
                  </p>
                </div>
              </div>
            )}

            {/* Brand Preview Strip */}
            <div className="flex items-center justify-between bg-zinc-950/60 border border-zinc-800/70 rounded-xl px-3.5 py-2.5">
              <StarkLabsLogo size="sm" />
              <span className="text-[11px] font-semibold text-emerald-400">
                يدعم العمل السريع وحفظ السلة
              </span>
            </div>

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-extrabold text-xs rounded-xl transition-colors cursor-pointer"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-20 left-4 right-4 sm:right-auto sm:left-6 z-50 flex items-center gap-2 rounded-xl bg-amber-500 text-zinc-950 px-3.5 py-2 text-xs font-extrabold shadow-xl"
    >
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>وضع عدم الاتصال — يتم عرض البيانات المحفوظة على جهازك</span>
    </div>
  );
};
