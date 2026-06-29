import { NavLink } from 'react-router-dom'
import { Briefcase, Mic2, LayoutList, FileText, Zap, Search, Cpu, MessageCircle, Code2, Compass } from 'lucide-react'

const sections = [
  {
    label: 'Discover',
    items: [
      { to: '/',       icon: Briefcase, label: 'Jobs',       end: true  },
      { to: '/scout',  icon: Search,    label: 'Job Scout',  end: false },
    ],
  },
  {
    label: 'Prepare',
    items: [
      { to: '/interview', icon: Mic2,      label: 'Interview Prep', end: false },
      { to: '/tailor',    icon: FileText,  label: 'Resume Tailor',  end: false },
      { to: '/coach',     icon: Zap,       label: 'App Coach',      end: false },
      { to: '/code',      icon: Code2,     label: 'Code Practice',  end: false },
      { to: '/career',    icon: Compass,   label: 'Career Track',   end: false },
    ],
  },
  {
    label: 'Track',
    items: [
      { to: '/tracker', icon: LayoutList, label: 'Tracker', end: false },
    ],
  },
  {
    label: 'Assist',
    items: [
      { to: '/chat', icon: MessageCircle, label: 'AI Career Chat', end: false },
    ],
  },
]

function NavItem({ to, icon: Icon, label, end }) {
  return (
    <NavLink to={to} end={end}
      className={({ isActive }) =>
        `group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
          isActive
            ? 'bg-white/10 text-white'
            : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
        }`
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
          )}
          <Icon size={16} className={`shrink-0 ${isActive ? 'text-primary' : 'text-slate-500 group-hover:text-slate-300'}`} />
          {label}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar() {
  return (
    <aside className="w-56 bg-sidebar flex flex-col h-screen shrink-0 border-r border-sidebar-border">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-primary flex items-center justify-center shrink-0">
            <Cpu size={14} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm tracking-tight leading-none">PlacementOS</p>
            <p className="text-slate-500 text-[10px] mt-0.5 leading-none">Find it → Prep → Get it</p>
          </div>
        </div>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-4">
        {sections.map(({ label, items }) => (
          <div key={label}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-600">
              {label}
            </p>
            <div className="space-y-0.5">
              {items.map(item => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-mint animate-pulse" />
          <p className="text-slate-600 text-[10px] font-medium">Groq llama-3.3-70b</p>
        </div>
      </div>
    </aside>
  )
}
