import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ChevronLeft, ShoppingCart, Plus, Minus, Trash2, Check, Lock } from 'lucide-react'
import toast from 'react-hot-toast'

interface MenuItem {
    id: number
    name: string
    price: number
    description?: string
    category: string
    image_url?: string
    prep_section_id: number
}

interface CartItem extends MenuItem {
    quantity: number
    notes?: string
}

interface Captain {
    id: number
    name: string
    email: string
}

export const CaptainMenuPage = () => {
    const [searchParams] = useSearchParams()
    const navigate = useNavigate()
    const tableId = searchParams.get('table')

    const [step, setStep] = useState<'pin' | 'menu'>('pin')
    const [pin, setPin] = useState('')
    const [selectedCaptain, setSelectedCaptain] = useState<Captain | null>(null)
    const [activeCategory, setActiveCategory] = useState<string>('all')
    const [cart, setCart] = useState<CartItem[]>([])
    const [showCart, setShowCart] = useState(false)

    // Fetch captains
    const { data: captains = [] } = useQuery<Captain[]>({
        queryKey: ['captains'],
        queryFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/public/captains`)
            if (!res.ok) throw new Error('Failed to load captains')
            return res.json()
        },
    })

    // Fetch menu items
    const { data: menuItems = [], isLoading } = useQuery({
        queryKey: ['menu-items'],
        queryFn: async () => {
            const res = await fetch(`${import.meta.env.VITE_API_URL}/menu-items`)
            if (!res.ok) throw new Error('Failed to load menu')
            return res.json()
        },
        enabled: step === 'menu',
    })

    // Load draft order when entering menu
    useEffect(() => {
        if (step !== 'menu' || !tableId) return

        fetch(`${import.meta.env.VITE_API_URL}/public/tables/${tableId}/draft-order`)
            .then(res => res.json())
            .then(draftItems => {
                if (draftItems.length > 0) {
                    const cartItems = draftItems.map((item: any) => ({
                        ...item.menu_item,
                        quantity: item.quantity,
                        notes: item.notes,
                    }))
                    setCart(cartItems)
                    toast.success(`تم تحميل ${draftItems.length} صنف من طلب الزبون`)
                }
            })
            .catch(() => { })
    }, [step, tableId])

    // Verify PIN
    const verifyPinMutation = useMutation({
        mutationFn: async () => {
            if (!selectedCaptain) throw new Error('No captain selected')

            const res = await fetch(`${import.meta.env.VITE_API_URL}/public/verify-pin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: selectedCaptain.id,
                    pin: pin,
                }),
            })

            const data = await res.json()
            if (!res.ok || !data.valid) {
                throw new Error('Invalid PIN')
            }
            return data
        },
        onSuccess: () => {
            toast.success('تم التحقق بنجاح!')
            setStep('menu')
        },
        onError: () => {
            toast.error('الرقم السري غير صحيح')
            setPin('')
        },
    })

    // Confirm order
    const confirmOrderMutation = useMutation({
        mutationFn: async () => {
            if (!tableId || !selectedCaptain) throw new Error('Missing data')

            const items = cart.map(item => ({
                menu_item_id: item.id,
                quantity: item.quantity,
                notes: item.notes || '',
            }))

            const res = await fetch(`${import.meta.env.VITE_API_URL}/public/tables/${tableId}/confirm-order`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    captain_id: selectedCaptain.id,
                    pin: pin,
                    items,
                }),
            })

            if (!res.ok) throw new Error('Failed to confirm order')
            return res.json()
        },
        onSuccess: () => {
            toast.success('تم تأكيد الطلب وإرساله للكاشير!')
            setTimeout(() => {
                navigate('/floor-plan')
            }, 2000)
        },
        onError: () => {
            toast.error('فشل تأكيد الطلب')
        },
    })

    // PIN Entry handlers
    const handlePinInput = (digit: string) => {
        if (pin.length < 4) {
            setPin(pin + digit)
        }
    }

    const handlePinDelete = () => {
        setPin(pin.slice(0, -1))
    }

    const handlePinSubmit = () => {
        if (pin.length === 4 && selectedCaptain) {
            verifyPinMutation.mutate()
        }
    }

    // Group items by category
    const itemsByCategory = menuItems.reduce((acc: any, item: MenuItem) => {
        if (!acc[item.category]) acc[item.category] = []
        acc[item.category].push(item)
        return acc
    }, {})

    // Cart functions
    const categories = ['all', ...new Set(menuItems.map((item: MenuItem) => item.category))] as string[]
    const filteredItems = activeCategory === 'all'
        ? menuItems
        : menuItems.filter((item: MenuItem) => item.category === activeCategory)

    const addToCart = (item: MenuItem) => {
        const existing = cart.find(i => i.id === item.id)
        if (existing) {
            setCart(cart.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))
        } else {
            setCart([...cart, { ...item, quantity: 1 }])
        }
        toast.success(`تمت الإضافة: ${item.name}`)
    }

    const updateQuantity = (itemId: number, delta: number) => {
        setCart(cart.map(item => {
            if (item.id === itemId) {
                const newQty = item.quantity + delta
                return newQty > 0 ? { ...item, quantity: newQty } : item
            }
            return item
        }).filter(item => item.quantity > 0))
    }

    const removeFromCart = (itemId: number) => {
        setCart(cart.filter(item => item.id !== itemId))
    }

    const totalPrice = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)

    if (!tableId) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-indigo-50 p-4">
                <div className="bg-white rounded-3xl p-8 shadow-xl text-center max-w-md w-full">
                    <h1 className="text-2xl font-black text-slate-900 mb-2">⚠️ خطأ</h1>
                    <p className="text-slate-600">رابط غير صحيح. يرجى مسح رمز QR من الطاولة.</p>
                </div>
            </div>
        )
    }

    // PIN Entry Screen
    if (step === 'pin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-100 p-4" dir="rtl">
                <div className="bg-white rounded-[2rem] p-8 shadow-2xl max-w-md w-full border border-white/50">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20">
                            <Lock className="text-white" size={32} />
                        </div>
                        <h1 className="text-2xl font-black text-slate-900 mb-2">تسجيل دخول كابتن</h1>
                        <p className="text-slate-500 font-bold">طاولة #{tableId}</p>
                    </div>

                    {/* Captain Selection */}
                    <div className="mb-8">
                        <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-3">اختر الكابتن</label>
                        <select
                            value={selectedCaptain?.id || ''}
                            onChange={(e) => {
                                const val = Number(e.target.value)
                                const captain = captains.find(c => c.id === val)
                                setSelectedCaptain(captain || null)
                                setPin('')
                            }}
                            className="w-full px-4 py-4 rounded-xl bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:bg-white transition-all font-bold text-lg outline-none cursor-pointer"
                        >
                            <option value="">-- اختر --</option>
                            {captains.map((captain) => (
                                <option key={captain.id} value={captain.id}>
                                    {captain.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {selectedCaptain && (
                        <div className="space-y-6">
                            {/* PIN Display */}
                            <div>
                                <label className="block text-sm font-black text-slate-400 uppercase tracking-wider mb-4 text-center">أدخل الرمز السري</label>
                                <div className="flex justify-center gap-4">
                                    {[0, 1, 2, 3].map(i => (
                                        <div
                                            key={i}
                                            className={`w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-2xl font-black transition-all ${pin[i]
                                                ? 'border-indigo-500 bg-indigo-50 text-indigo-600'
                                                : 'border-slate-100 bg-slate-50 text-slate-300'
                                                }`}
                                        >
                                            {pin[i] ? '●' : ''}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* PIN Keypad */}
                            <div className="grid grid-cols-3 gap-3">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                    <button
                                        key={num}
                                        onClick={() => handlePinInput(String(num))}
                                        className="h-16 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 font-black text-2xl transition-all active:scale-95"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <button
                                    onClick={handlePinDelete}
                                    className="h-16 rounded-xl bg-rose-50 text-rose-500 hover:bg-rose-100 font-black transition-all active:scale-95 flex items-center justify-center"
                                >
                                    <ChevronLeft size={24} />
                                </button>
                                <button
                                    onClick={() => handlePinInput('0')}
                                    className="h-16 rounded-xl bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 font-black text-2xl transition-all active:scale-95"
                                >
                                    0
                                </button>
                                <button
                                    onClick={handlePinSubmit}
                                    disabled={pin.length !== 4 || verifyPinMutation.isPending}
                                    className="h-16 rounded-xl bg-indigo-600 text-white font-black text-xl transition-all disabled:opacity-50 hover:bg-indigo-700 active:scale-95 shadow-lg shadow-indigo-500/30 flex items-center justify-center"
                                >
                                    {verifyPinMutation.isPending ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={28} />}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-50" dir="rtl">
            {/* Top Navigation */}
            <div className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md border-b border-slate-200 z-50 h-[70px]">
                <div className="h-full max-w-7xl mx-auto px-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-black text-slate-900">قائمة الكابتن</h1>
                        <p className="text-xs text-slate-500 font-bold">
                            طاولة {tableId} • <span className="text-indigo-600">{selectedCaptain?.name}</span>
                        </p>
                    </div>

                    {/* Mobile Cart Toggle */}
                    <button
                        onClick={() => setShowCart(!showCart)}
                        className="lg:hidden relative p-3 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                    >
                        <ShoppingCart size={24} className="text-slate-700" />
                        {cart.length > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                                {cart.reduce((sum, item) => sum + item.quantity, 0)}
                            </span>
                        )}
                    </button>
                </div>
            </div>

            <div className="pt-[70px] max-w-7xl mx-auto flex">
                {/* Sidebar Categories (Desktop) */}
                <div className="hidden lg:block w-64 fixed top-[70px] right-[max(0px,calc(50%-40rem))] bottom-0 bg-white border-l border-slate-200 overflow-y-auto z-40">
                    <div className="p-6 space-y-2">
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-4">الأقسام</h3>
                        {Object.keys(itemsByCategory).map(cat => (
                            <button
                                key={cat}
                                onClick={() => scrollToCategory(cat)}
                                className={`w-full text-right px-4 py-3 rounded-xl font-bold transition-all ${activeCategory === cat
                                    ? 'bg-indigo-50 text-indigo-600 border-r-4 border-indigo-600'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Mobile Categories (Horizontal) */}
                <div className="lg:hidden fixed top-[70px] left-0 right-0 bg-white border-b border-slate-200 z-40 overflow-x-auto">
                    <div className="flex p-3 gap-3 min-w-max">
                        {Object.keys(itemsByCategory).map(cat => (
                            <button
                                key={cat}
                                onClick={() => scrollToCategory(cat)}
                                className={`px-5 py-2 rounded-full font-bold text-sm whitespace-nowrap transition-all ${activeCategory === cat
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                                    : 'bg-slate-100 text-slate-600'
                                    }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 lg:mr-64 p-4 lg:p-8 pt-[80px] lg:pt-8 pb-32">
                    {Object.entries(itemsByCategory).map(([category, items]: [string, any]) => (
                        <div key={category} id={`cat-${category}`} className="mb-12 scroll-mt-24">
                            <h2 className="text-2xl font-black text-slate-900 mb-6 flex items-center gap-3">
                                <span className="w-8 h-1 bg-indigo-600 rounded-full"></span>
                                {category}
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {items.map((item: MenuItem) => (
                                    <div key={item.id} className="group bg-white rounded-3xl p-4 shadow-sm border border-slate-100 hover:border-indigo-200 hover:shadow-xl transition-all duration-300">
                                        <div className="flex gap-4">
                                            {item.image_url && (
                                                <img
                                                    src={item.image_url}
                                                    alt={item.name}
                                                    className="w-24 h-24 rounded-2xl object-cover bg-slate-100 group-hover:scale-105 transition-transform duration-500"
                                                />
                                            )}
                                            <div className="flex-1 flex flex-col justify-between">
                                                <div>
                                                    <h3 className="font-bold text-slate-900 line-clamp-1">{item.name}</h3>
                                                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{item.description}</p>
                                                </div>
                                                <div className="flex items-center justify-between mt-3">
                                                    <span className="font-black text-lg text-indigo-600">{item.price}€</span>
                                                    <button
                                                        onClick={() => addToCart(item)}
                                                        className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-indigo-600 transition-colors shadow-lg"
                                                    >
                                                        <Plus size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Cart Sidebar (Desktop Sticky) */}
                <div className="hidden lg:block w-96 fixed top-[70px] left-[max(0px,calc(50%-40rem))] bottom-0 bg-white border-r border-slate-200 z-40">
                    <CartContent
                        cart={cart}
                        totalPrice={totalPrice}
                        onUpdateQuantity={updateQuantity}
                        onRemove={removeFromCart}
                        onSubmit={() => confirmOrderMutation.mutate()}
                        isSubmitting={confirmOrderMutation.isPending}
                    />
                </div>
            </div>

            {/* Mobile Cart Drawer */}
            {showCart && (
                <div className="lg:hidden fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCart(false)} />
                    <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-[2rem] shadow-2xl max-h-[80vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-6" />
                            <CartContent
                                cart={cart}
                                totalPrice={totalPrice}
                                onUpdateQuantity={updateQuantity}
                                onRemove={removeFromCart}
                                onSubmit={() => confirmOrderMutation.mutate()}
                                isSubmitting={confirmOrderMutation.isPending}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Extracted Cart Component for Captain (Reused structure but customized for Confirmation)
const CartContent = ({ cart, totalPrice, onUpdateQuantity, onRemove, onSubmit, isSubmitting }: any) => {
    if (cart.length === 0) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-slate-50/50">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-lg mb-6">
                    <ShoppingCart size={40} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-black text-slate-900 mb-2">طلب فارغ</h3>
                <p className="text-sm text-slate-500 bg-white px-4 py-2 rounded-full border border-slate-100">
                    أضف أصناف لتأكيدها
                </p>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-white">
            <div className="p-6 border-b border-slate-100 bg-white">
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                    <ShoppingCart className="text-indigo-600" />
                    مراجعة الطلب
                </h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cart.map((item: any) => (
                    <div key={item.id} className="group flex gap-4 bg-white p-3 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-lg transition-all">
                        <div className="flex flex-col items-center justify-between bg-slate-50 rounded-xl w-10 py-1">
                            <button onClick={() => onUpdateQuantity(item.id, 1)} className="p-1 hover:text-green-600 transition-colors"><Plus size={14} /></button>
                            <span className="font-bold text-sm">{item.quantity}</span>
                            <button onClick={() => onUpdateQuantity(item.id, -1)} className="p-1 hover:text-red-600 transition-colors"><Minus size={14} /></button>
                        </div>

                        <div className="flex-1 py-1">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-bold text-slate-900 text-sm line-clamp-1">{item.name}</h4>
                                <span className="font-black text-indigo-600 text-sm">{(item.price * item.quantity).toFixed(1)}</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mb-2">{item.price} / وحدة</p>
                        </div>

                        <button onClick={() => onRemove(item.id)} className="self-center p-2 text-slate-300 hover:text-rose-500 transition-colors">
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <span className="text-slate-500 font-bold">المجموع</span>
                    <span className="text-2xl font-black text-slate-900">{totalPrice.toFixed(2)}€</span>
                </div>
                <button
                    onClick={onSubmit}
                    disabled={isSubmitting}
                    className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-slate-900/20 hover:bg-emerald-600 hover:shadow-emerald-600/30 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-3"
                >
                    {isSubmitting ? (
                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                        <>
                            <span>تأكيد وإرسال للمطبخ</span>
                            <Check size={20} />
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}
