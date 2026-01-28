import { useTranslation } from 'react-i18next'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useMemo, useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchPrepSections } from '../api/sections'
import {
    LayoutDashboard, UtensilsCrossed,
    ChefHat, ClipboardList, Settings, LogOut, TrendingUp, Archive, Languages,
    ChevronLeft, ChevronRight, Menu
} from 'lucide-react'

const NavContent = ({
    navItems,
    user,
    i18n,
    toggleLanguage,
    handleLogout,
    hasPermission,
    location,
    t
}: any) => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
        <div className="h-16 flex items-center px-6 border-b border-slate-100 shrink-0">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white mr-3 rtl:mr-0 rtl:ml-3">
                <LayoutDashboard size={20} />
            </div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">RMS</h1>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-6">
            {navItems.map((group: any) => {
                const filtered = group.items.filter((item: any) => hasPermission(item.permission))
                if (filtered.length === 0) return null

                return (
                    <div key={group.group}>
                        <div className="px-3 mb-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {group.group}
                        </div>
                        <div className="space-y-0.5">
                            {filtered.map((item: any) => {
                                const isActive = location.pathname === item.path
                                return (
                                    <Link
                                        key={item.path}
                                        to={item.path}
                                        className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive
                                            ? 'bg-indigo-50 text-indigo-700'
                                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                            }`}
                                    >
                                        <span className={isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}>
                                            {item.icon}
                                        </span>
                                        {item.label}
                                    </Link>
                                )
                            })}
                        </div>
                    </div>
                )
            })}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-1">
            <div className="px-3 py-2 flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-sm font-bold">
                    {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                    <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
                    <p className="text-xs text-slate-500 truncate">{user?.roles?.[0]?.name || 'Staff'}</p>
                </div>
            </div>

            <button
                onClick={toggleLanguage}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-50 font-medium"
            >
                <Languages size={18} />
                {i18n.language.startsWith('ar') ? 'English' : 'العربية'}
            </button>

            <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-rose-600 hover:bg-rose-50 font-medium transition-colors"
            >
                <LogOut size={18} />
                {t('nav.sign_out')}
            </button>
        </div>
    </div>
)

export const Layout = () => {
    const { t, i18n } = useTranslation()
    const { user, logout, hasPermission } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

    const isRtl = i18n.language.startsWith('ar')

    useEffect(() => {
        setIsMobileMenuOpen(false)
    }, [location.pathname])

    const { data: prepSections = [] } = useQuery({
        queryKey: ['prep-sections'],
        queryFn: fetchPrepSections,
    })

    const navItems = useMemo(() => [
        {
            group: 'OPERATIONS', items: [
                { path: '/reservations', label: t('nav.bookings'), icon: <ClipboardList size={20} />, permission: 'manage_reservations' },
                { path: '/pos', label: t('nav.pos'), icon: <UtensilsCrossed size={20} />, permission: 'create_order' },
            ]
        },
        {
            group: 'PRODUCTION', items: [
                ...(hasPermission('manage_settings') ? prepSections.map(s => ({
                    path: `/sections/${s.id}/orders`,
                    label: s.name,
                    icon: <ChefHat size={20} />,
                    permission: 'update_item_status'
                })) : []),
                ...(hasPermission('create_order') && !user?.prep_section_id ? [{
                    path: '/sections/all/orders',
                    label: t('common.all_section'),
                    icon: <ClipboardList size={20} />,
                    permission: 'update_item_status'
                }] : []),
                ...(user?.prep_section_id && !hasPermission('manage_settings') ? prepSections.filter(s => s.id === user.prep_section_id).map(s => ({
                    path: `/sections/${s.id}/orders`,
                    label: s.name,
                    icon: <ChefHat size={20} />,
                    permission: 'update_item_status'
                })) : []),
            ]
        },
        {
            group: 'INSIGHTS', items: [
                { path: '/reports', label: t('nav.analytics'), icon: <TrendingUp size={20} />, permission: 'view_reports' },
                { path: '/archive', label: t('nav.archive'), icon: <Archive size={20} />, permission: 'view_reports' },
            ]
        },
        {
            group: 'SYSTEM', items: [
                { path: '/admin', label: t('nav.management'), icon: <Settings size={20} />, permission: 'manage_settings' },
            ]
        }
    ], [prepSections, user, hasPermission, t, i18n.language])

    const toggleLanguage = () => {
        const next = i18n.language.startsWith('ar') ? 'en' : 'ar'
        i18n.changeLanguage(next)
    }

    const handleLogout = async () => {
        await logout()
        navigate('/login')
    }

    const commonProps = { navItems, user, i18n, toggleLanguage, handleLogout, hasPermission, location, t }

    return (
        <div className="flex h-screen bg-slate-50 w-full overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
            {/* Desktop Sidebar */}
            <aside className={`hidden md:block border-r border-slate-200 bg-white transition-all duration-300 ease-in-out overflow-hidden shadow-sm shrink-0 ${isSidebarOpen ? 'w-64' : 'w-0 opacity-0'}`}>
                <div className="w-64 h-full">
                    <NavContent {...commonProps} />
                </div>
            </aside>

            {/* Mobile Sidebar (Drawer) */}
            <div className={`fixed inset-0 z-[60] md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                <div className={`absolute top-0 bottom-0 ${isRtl ? 'right-0' : 'left-0'} w-72 bg-white shadow-2xl transition-transform duration-300 ${isMobileMenuOpen ? 'translate-x-0' : (isRtl ? 'translate-x-full' : '-translate-x-full')
                    }`}>
                    <NavContent {...commonProps} />
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden w-full relative">
                {/* Mobile Header */}
                <header className="h-16 bg-white border-b border-slate-200 flex items-center px-4 justify-between md:hidden shrink-0 z-40">
                    <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                        <Menu size={24} />
                    </button>
                    <span className="font-bold text-lg text-slate-900">RMS</span>
                    <div className="w-10" />
                </header>

                {/* Desktop Toggle (Floating) */}
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className={`hidden md:flex absolute top-4 z-50 p-2 bg-white border border-slate-200 rounded-lg shadow-md text-slate-500 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50 transition-all duration-300 ${isRtl ? 'right-4' : 'left-4'}`}
                    title={isSidebarOpen ? t('common.hide') : t('common.show')}
                >
                    {isSidebarOpen ? (isRtl ? <ChevronRight size={20} /> : <ChevronLeft size={20} />) : (isRtl ? <ChevronLeft size={20} /> : <ChevronRight size={20} />)}
                </button>

                <div className="flex-1 overflow-y-auto p-4 md:p-8 w-full">
                    <div className="max-w-7xl mx-auto w-full">
                        <Outlet />
                    </div>
                </div>
            </main>
        </div>
    )
}

