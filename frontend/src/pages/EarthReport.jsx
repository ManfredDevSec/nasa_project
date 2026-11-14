import Header from '../components/Header'

export default function EarthReport() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header backTo="/" />
      <div className="flex flex-col items-center justify-center gap-4 py-32 px-4 text-center">
        <p className="text-5xl">🌍</p>
        <h1 className="text-2xl font-black">Earth Report</h1>
        <p className="text-slate-400 max-w-sm">Coming next — weekly summary report for flight surgeons on the ground.</p>
      </div>
    </div>
  )
}
