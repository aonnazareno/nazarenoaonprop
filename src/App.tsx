import { useState } from 'react'
import { ClipboardList, History, Settings, Megaphone } from 'lucide-react'
import Header from './components/Header'
import NuevaTasacion from './components/nueva-tasacion/NuevaTasacion'
import Historial from './components/historial/Historial'
import Configuracion from './components/configuracion/Configuracion'
import Campanas from './components/campanas/Campanas'
import clsx from 'clsx'

type Tab = 'nueva' | 'historial' | 'campanas' | 'configuracion'

const TABS: { id: Tab; label: string; Icon: React.ElementType }[] = [
  { id: 'nueva', label: 'Nueva tasación', Icon: ClipboardList },
  { id: 'historial', label: 'Historial', Icon: History },
  { id: 'campanas', label: 'Campañas', Icon: Megaphone },
  { id: 'configuracion', label: 'Configuración', Icon: Settings },
]

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('nueva')

  return (
    <div className="min-h-screen bg-crema flex flex-col">
      <Header />

      {/* Tab nav */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4">
          <nav className="flex gap-1">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={clsx(
                  'flex items-center gap-2 px-4 py-3.5 text-sm font-medium font-montserrat',
                  'border-b-2 transition-all duration-200',
                  activeTab === id
                    ? 'border-verde text-verde'
                    : 'border-transparent text-gris-dark hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {activeTab === 'nueva' && <NuevaTasacion />}
        {activeTab === 'historial' && <Historial onOpen={() => setActiveTab('nueva')} />}
        {activeTab === 'campanas' && <Campanas />}
        {activeTab === 'configuracion' && <Configuracion />}
      </main>
    </div>
  )
}
