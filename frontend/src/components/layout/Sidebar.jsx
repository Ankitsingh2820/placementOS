import { NavLink } from 'react-router-dom'
import { Briefcase, Mic2, LayoutList } from 'lucide-react'

const nav = [
  { to: '/',          icon: Briefcase,  label: 'Jobs',          end: true },
  { to: '/interview', icon: Mic2,       label: 'Interview Prep', end: false },
  { to: '/tracker',   icon: LayoutList, label: 'Tracker',        end: false },
]

export function Sidebar() {
  return (
    <aside className="w-56 bg-sidebar flex flex-col h-screen shrink-0">
      <div className="px-5 py-5 border-b border-slate-800">
        <p className="text-white font-bold text-base tracking-tight">PlacementOS</p>
        <p className="text-slate-500 text-xs mt-0.5">Find it → Prep → Get it</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, icon: Icon, label, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-5 py-4 border-t border-slate-800">
        <p className="text-slate-600 text-xs">Powered by Groq llama-3.3-70b</p>
      </div>
    </aside>
  )
}
