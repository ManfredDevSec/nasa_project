import { useParams } from 'react-router-dom'
import Header from '../components/Header'

export default function VisionTest() {
  const { id } = useParams()
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Header backTo={`/astronaut/${id}`} />
      <div className="flex flex-col items-center justify-center gap-4 py-32 px-4 text-center">
        <p className="text-5xl">🔭</p>
        <h1 className="text-2xl font-black">Vision Test</h1>
        <p className="text-slate-400 max-w-sm">Coming next — interactive near-vision, contrast, and Amsler grid tests.</p>
      </div>
    </div>
  )
}
