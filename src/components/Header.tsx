import { Home } from 'lucide-react'

export default function Header() {
  return (
    <header className="bg-verde text-white shadow-md">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
            <Home size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-cormorant text-2xl font-semibold leading-none tracking-wide">
              TasadorIA
            </h1>
            <p className="text-white/70 text-[10px] font-montserrat uppercase tracking-widest leading-none mt-0.5">
              Calderón Propiedades · Mat. 227
            </p>
          </div>
        </div>
        <span className="chip bg-white/20 text-white border border-white/30 text-[11px]">
          Uso interno
        </span>
      </div>
    </header>
  )
}
