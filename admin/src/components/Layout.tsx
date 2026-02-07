import { NavLink, Outlet } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Дашборд', icon: '◻' },
  { to: '/campaigns', label: 'Кампании', icon: '▶' },
  { to: '/creatives', label: 'Креативы', icon: '◼' },
  { to: '/placements', label: 'Площадки', icon: '⊞' },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen">
      {/* Сайдбар */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="px-6 py-5 border-b border-gray-800">
          <h1 className="text-xl font-bold tracking-tight">AdRotator</h1>
          <p className="text-xs text-gray-400 mt-1">Управление рекламой</p>
        </div>
        <nav className="flex-1 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-6 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="px-6 py-4 text-xs text-gray-500 border-t border-gray-800">
          AdRotator v1.0
        </div>
      </aside>

      {/* Контент */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
