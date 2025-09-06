import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  key: string;
  title: string;
  path: string;
  sublinks?: { key: string; title: string; path: string }[];
}

const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', title: 'Dashboard', path: '/' },
  {
    key: 'components',
    title: 'Components',
    path: '/components',
    sublinks: [
      { key: 'components-list', title: 'All Components', path: '/components' },
      { key: 'components-toggle', title: 'Toggle', path: '/components/toggle' },
      { key: 'components-button', title: 'Button', path: '/components/button' },
    ],
  },
  { key: 'docs', title: 'Docs', path: '/docs', sublinks: [{ key: 'docs-api', title: 'API', path: '/docs/api' }] },
  { key: 'settings', title: 'Settings', path: '/settings' },
];

export function Navigation() {
  const location = useLocation();

  const isActive = (path: string) => {
    // active if current location starts with path (so /components/toggle matches /components)
    return location.pathname === path || location.pathname.startsWith(path + '/') || (path === '/' && location.pathname === '/');
  };

  return (
    <nav className="w-full bg-transparent">
      <ul className="flex space-x-4 items-center">
        {NAV_ITEMS.map(item => (
          <li key={item.key} className="relative">
            <Link
              to={item.path}
              className={`px-3 py-2 rounded-md font-medium text-sm ${isActive(item.path) ? 'text-accent underline' : 'text-primary'}`}
            >
              {item.title}
            </Link>

            {item.sublinks && item.sublinks.length > 0 && (
              <div className="absolute left-0 mt-2 bg-white rounded-md shadow-lg z-10">
                <ul className="py-1">
                  {item.sublinks.map(s => (
                    <li key={s.key}>
                      <Link
                        to={s.path}
                        className={`block px-4 py-2 text-sm ${location.pathname === s.path ? 'text-accent font-semibold' : 'text-primary/90 hover:bg-primary/5'}`}
                      >
                        {s.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default Navigation;
