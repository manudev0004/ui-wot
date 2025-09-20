import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useNavbar } from '../context/NavbarContext';

function SunIcon() {
  return (
    <svg width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M11.7985 0.617218C11.7516 0.367218 11.5829 0.157843 11.3485 0.0609679C11.1141 -0.0359071 10.8454 -0.0077821 10.636 0.135968L8.05787 1.91097L5.47974 0.132843C5.27037 -0.0109071 5.00162 -0.0390321 4.76724 0.0578429C4.53287 0.154718 4.36412 0.364093 4.31724 0.614093L3.75162 3.69222L0.673492 4.26097C0.423492 4.30784 0.214117 4.47659 0.117242 4.71097C0.0203673 4.94534 0.0484923 5.21409 0.192242 5.42347L1.96724 8.00159L0.189117 10.5797C0.0453673 10.7891 0.0172423 11.0578 0.114117 11.2922C0.210992 11.5266 0.420367 11.6985 0.670367 11.7422L3.74849 12.3078L4.31412 15.386C4.36099 15.636 4.52974 15.8453 4.76412 15.9422C4.99849 16.0391 5.26724 16.011 5.47662 15.8672L8.05787 14.0922L10.636 15.8703C10.8454 16.0141 11.1141 16.0422 11.3485 15.9453C11.5829 15.8485 11.7516 15.6391 11.7985 15.3891L12.3641 12.311L15.4422 11.7453C15.6922 11.6985 15.9016 11.5297 15.9985 11.2953C16.0954 11.061 16.0672 10.7922 15.9235 10.5828L14.1485 8.00159L15.9266 5.42347C16.0704 5.21409 16.0985 4.94534 16.0016 4.71097C15.9047 4.47659 15.6954 4.30784 15.4454 4.26097L12.3672 3.69534L11.7985 0.617218ZM8.48287 3.43909L10.5329 2.02659L10.9829 4.47347C11.0391 4.77972 11.2797 5.02034 11.586 5.07659L14.0329 5.52659L12.6204 7.57659C12.4422 7.83284 12.4422 8.17034 12.6204 8.42659L14.0329 10.4766L11.586 10.9266C11.2797 10.9828 11.0391 11.2235 10.9829 11.5297L10.5329 13.9766L8.48287 12.5641C8.22662 12.386 7.88912 12.386 7.63287 12.5641L5.58287 13.9766L5.13287 11.5297C5.07662 11.2235 4.83599 10.9828 4.52974 10.9266L2.08287 10.4766L3.49537 8.42659C3.67349 8.17034 3.67349 7.83284 3.49537 7.57659L2.08287 5.52659L4.52974 5.07659C4.83599 5.02034 5.07662 4.77972 5.13287 4.47347L5.58287 2.02659L7.63287 3.43909C7.88912 3.61722 8.22662 3.61722 8.48287 3.43909ZM8.05787 11.5016C8.98612 11.5016 9.87636 11.1328 10.5327 10.4765C11.1891 9.82009 11.5579 8.92985 11.5579 8.00159C11.5579 7.07333 11.1891 6.1831 10.5327 5.52672C9.87636 4.87034 8.98612 4.50159 8.05787 4.50159C7.12961 4.50159 6.23937 4.87034 5.58299 5.52672C4.92662 6.1831 4.55787 7.07333 4.55787 8.00159C4.55787 8.92985 4.92662 9.82009 5.58299 10.4765C6.23937 11.1328 7.12961 11.5016 8.05787 11.5016ZM6.05787 8.00159C6.05787 7.47116 6.26858 6.96245 6.64365 6.58738C7.01873 6.21231 7.52743 6.00159 8.05787 6.00159C8.5883 6.00159 9.09701 6.21231 9.47208 6.58738C9.84715 6.96245 10.0579 7.47116 10.0579 8.00159C10.0579 8.53203 9.84715 9.04073 9.47208 9.41581C9.09701 9.79088 8.5883 10.0016 8.05787 10.0016C7.52743 10.0016 7.01873 9.79088 6.64365 9.41581C6.26858 9.04073 6.05787 8.53203 6.05787 8.00159Z" fill="currentColor"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="13" height="14" viewBox="0 0 13 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4.63308 2.08301C3.97683 3.14863 3.59871 4.40488 3.59871 5.74863C3.59871 8.81113 5.56121 11.4174 8.29871 12.3643C7.91121 12.4518 7.50808 12.4986 7.09246 12.4986C4.06746 12.4986 1.61121 10.0393 1.61121 6.99863C1.61121 4.84551 2.84246 2.98613 4.63621 2.08301H4.63308ZM6.57371 0.0205078C2.95808 0.286133 0.111206 3.30801 0.111206 6.99863C0.111206 10.8643 3.23621 13.9986 7.09558 13.9986C8.58933 13.9986 9.97058 13.5299 11.1081 12.7299C11.1675 12.6893 11.2237 12.6455 11.28 12.6049C11.43 12.4924 11.5737 12.3736 11.7143 12.2486C11.7987 12.1736 11.88 12.0986 11.9612 12.0205C12.1175 11.8674 12.1581 11.6299 12.0581 11.4361C11.9581 11.2424 11.7425 11.133 11.5268 11.1705C11.4112 11.1893 11.2956 11.208 11.18 11.2205C11.0237 11.2361 10.8643 11.2486 10.7018 11.2518C10.6643 11.2518 10.6237 11.2518 10.5862 11.2518C10.5831 11.2518 10.58 11.2518 10.5768 11.2518C7.55183 11.2455 5.10183 8.78613 5.10183 5.75176C5.10183 4.03926 5.87996 2.51113 7.10496 1.50176C7.13621 1.47363 7.17058 1.44863 7.20496 1.42051C7.32996 1.32051 7.46121 1.22676 7.59558 1.13926C7.69246 1.07676 7.79246 1.01426 7.89558 0.958008C8.08621 0.848633 8.18308 0.629883 8.13621 0.417383C8.08933 0.204883 7.90808 0.0455078 7.68933 0.0267578C7.57683 0.0173828 7.46746 0.0111328 7.35496 0.00800776C7.27058 0.00488276 7.18308 0.00488281 7.09871 0.00488281C6.99558 0.00488281 6.89558 0.00800784 6.79246 0.0111328C6.72058 0.0142578 6.64871 0.0173828 6.57683 0.0236328L6.57371 0.0205078Z" fill="currentColor"/>
    </svg>
  );
}

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { content } = useNavbar();
  const [isDark, setIsDark] = useState<boolean>(() => document.documentElement.classList.contains('dark'));

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [isDark]);

  const showBack = useMemo(() => location.pathname !== '/' && location.pathname !== '', [location.pathname]);
  const title = useMemo(() => {
    if (location.pathname.startsWith('/td-input')) return 'ADD THING DESCRIPTION';
    if (location.pathname.startsWith('/affordances')) return 'SELECT AFFORDANCES';
    if (location.pathname.startsWith('/components')) return 'DASHBOARD';
    return '';
  }, [location.pathname]);

  return (
    <header className="w-full"
      style={{ height: 'var(--navbar-height)', backgroundColor: 'var(--navbar-bg)' }}
    >
      <nav className="w-full h-full border-b border-primary/20">
        <div className="w-full h-full px-[var(--navbar-padding)] grid grid-cols-[auto_1fr_auto] items-center gap-[var(--navbar-content-gap)] whitespace-nowrap overflow-hidden">
          {/* Left: Back button + Title */}
          <div className="flex items-center gap-2 min-w-0 flex-shrink">
            {showBack && (
              <button
                onClick={() => navigate(-1)}
                className="p-2 text-primary hover:text-accent hover:bg-neutral-light rounded-lg transition-colors"
                aria-label="Go back"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                  <path
                    fillRule="evenodd"
                    d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            )}
            {title && (
              <h1 className="truncate font-hero font-bold text-primary"
                  style={{ fontSize: 'var(--font-size-lg)' }}>
                {title}
              </h1>
            )}
          </div>

          {/* Center: contextual info only, slightly offset left for balance */}
          <div className="min-w-0 flex items-center justify-center overflow-hidden">
            {content?.info && (
              <div className="truncate text-primary/80 font-body translate-x-[-var(--navbar-center-offset)]"
                   style={{ fontSize: 'var(--font-size-sm)' }}>
                {content.info}
              </div>
            )}
          </div>

          {/* Right: actions then Theme toggle */}
          <div className="flex items-center gap-[var(--navbar-content-gap)] flex-shrink-0">
            {content?.actions && (
              <div className="flex items-center gap-2"
                   style={{ fontSize: 'var(--font-size-sm)' }}>
                {content.actions}
              </div>
            )}
            <span className="sr-only">Theme</span>
            <button
              onClick={() => setIsDark(v => !v)}
              className="inline-flex items-center rounded-md px-2 py-2 text-primary hover:text-accent hover:bg-neutral-light transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <span className="inline-flex items-center justify-center w-5 h-5" aria-hidden="true">
                {isDark ? <SunIcon /> : <MoonIcon />}
              </span>
            </button>
          </div>
        </div>
      </nav>
    </header>
  );
}
