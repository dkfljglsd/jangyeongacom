import { Link } from 'react-router-dom'
import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Float, MeshDistortMaterial, Sphere, Box as DreiBox, Torus, Environment } from '@react-three/drei'
import { motion } from 'framer-motion'
import {
  Sparkles, Zap, Download, MousePointer, ArrowRight,
  Box, RotateCcw, Cpu, Globe
} from 'lucide-react'

// Animated 3D scene for hero
function HeroScene() {
  const group = useRef()
  useFrame((state) => {
    if (group.current) {
      group.current.rotation.y = state.clock.elapsedTime * 0.15
    }
  })

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />
      <pointLight position={[-3, 3, -3]} intensity={0.8} color="#818cf8" />
      <pointLight position={[3, -2, 3]} intensity={0.6} color="#38bdf8" />
      <Environment preset="night" />

      <group ref={group}>
        {/* Table top */}
        <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[2.2, 0.1, 1.2]} />
            <meshStandardMaterial color="#8B5E3C" metalness={0.1} roughness={0.8} />
          </mesh>
          {/* Table legs */}
          {[[-0.95, 0, -0.5], [0.95, 0, -0.5], [-0.95, 0, 0.5], [0.95, 0, 0.5]].map(([x, y, z], i) => (
            <mesh key={i} position={[x, y, z]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 1, 16]} />
              <meshStandardMaterial color="#6B4226" metalness={0.1} roughness={0.9} />
            </mesh>
          ))}
        </Float>

        {/* Floating sphere */}
        <Float speed={2} rotationIntensity={0.5} floatIntensity={0.8}>
          <mesh position={[1.8, 1.2, 0.5]}>
            <sphereGeometry args={[0.25, 32, 32]} />
            <meshStandardMaterial color="#60a5fa" metalness={0.9} roughness={0.1} />
          </mesh>
        </Float>

        {/* Floating torus */}
        <Float speed={1.8} rotationIntensity={1} floatIntensity={0.5}>
          <mesh position={[-1.8, 1.5, -0.3]}>
            <torusGeometry args={[0.3, 0.1, 16, 100]} />
            <meshStandardMaterial color="#a78bfa" metalness={0.8} roughness={0.2} />
          </mesh>
        </Float>

        {/* Small box */}
        <Float speed={1.2} rotationIntensity={0.8} floatIntensity={0.6}>
          <mesh position={[0.3, 1.3, 0.8]}>
            <boxGeometry args={[0.3, 0.3, 0.3]} />
            <meshStandardMaterial color="#34d399" metalness={0.5} roughness={0.3} />
          </mesh>
        </Float>
      </group>

      <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={0.5} />
    </>
  )
}

const FEATURES = [
  {
    icon: Sparkles,
    title: 'Text to 3D',
    desc: 'Describe anything in plain language and watch AI create a 3D model instantly.',
    color: 'text-blue-400',
    bg: 'bg-blue-500/10',
  },
  {
    icon: Zap,
    title: 'Real-time Preview',
    desc: 'See your model rendered in real-time with professional lighting and shadows.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
  },
  {
    icon: MousePointer,
    title: 'Interactive Editor',
    desc: 'Rotate, zoom, and pan. Select objects and tweak their material and position.',
    color: 'text-purple-400',
    bg: 'bg-purple-500/10',
  },
  {
    icon: Download,
    title: 'Export Anywhere',
    desc: 'Download your models as STL for 3D printing or GLTF for game engines.',
    color: 'text-green-400',
    bg: 'bg-green-500/10',
  },
  {
    icon: Globe,
    title: 'Fully Browser-Based',
    desc: 'No downloads, no accounts. Open your browser and start designing immediately.',
    color: 'text-cyan-400',
    bg: 'bg-cyan-500/10',
  },
  {
    icon: Cpu,
    title: 'Powered by Claude AI',
    desc: 'Backed by Anthropic\'s Claude to understand complex spatial descriptions.',
    color: 'text-orange-400',
    bg: 'bg-orange-500/10',
  },
]

const DEMO_PROMPTS = [
  '"A wooden chair with cushion"',
  '"A sci-fi spacecraft"',
  '"A chess piece - king"',
  '"A modern lamp"',
]

function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 flex items-center px-6 md:px-12">
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/50" />
      <div className="relative flex items-center gap-3 w-full max-w-6xl mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
            <Box className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-white">CAD AI Studio</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2.5 py-1 rounded-full font-medium">
            Free · No signup
          </span>
          <Link
            to="/editor"
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Launch Editor
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </nav>
  )
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      <Navbar />

      {/* Hero */}
      <section className="relative min-h-screen flex items-center pt-16">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] bg-purple-600/10 rounded-full blur-[80px]" />
        </div>

        <div className="relative w-full max-w-6xl mx-auto px-6 md:px-12 grid md:grid-cols-2 gap-12 items-center py-20">
          {/* Text */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20 px-3 py-1.5 rounded-full mb-6">
                <Sparkles className="w-3 h-3" />
                AI-Powered 3D Modeling
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6"
            >
              Describe it.
              <br />
              <span className="text-gradient">AI builds it.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-zinc-400 text-lg leading-relaxed mb-8 max-w-md"
            >
              The free, browser-based AI CAD platform. Type a description and get a fully
              editable 3D model in seconds — no expertise required.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap gap-3"
            >
              <Link
                to="/editor"
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors glow-blue"
              >
                <Sparkles className="w-4 h-4" />
                Start Designing Free
              </Link>
              <Link
                to="/editor"
                className="flex items-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold rounded-xl transition-colors border border-zinc-700"
              >
                <Box className="w-4 h-4" />
                View Demo
              </Link>
            </motion.div>

            {/* Sample prompts */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-8 flex flex-wrap gap-2"
            >
              {DEMO_PROMPTS.map((p) => (
                <span key={p} className="text-xs text-zinc-600 italic">{p}</span>
              ))}
            </motion.div>
          </div>

          {/* 3D Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="h-[400px] md:h-[500px] rounded-2xl overflow-hidden border border-zinc-800 relative"
            style={{ background: 'radial-gradient(ellipse at 50% 50%, #0f172a 0%, #09090b 100%)' }}
          >
            <Canvas camera={{ position: [3, 2, 4], fov: 45 }}>
              <Suspense fallback={null}>
                <HeroScene />
              </Suspense>
            </Canvas>
            {/* Overlay label */}
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
              <span className="text-xs text-zinc-500 glass px-2.5 py-1 rounded-full">
                Live 3D Preview
              </span>
              <span className="text-xs text-zinc-600">← Drag to rotate</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-6 md:px-12">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything you need to design in 3D
            </h2>
            <p className="text-zinc-400 text-lg max-w-xl mx-auto">
              A complete CAD workflow powered by AI, running entirely in your browser.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                viewport={{ once: true }}
                className="p-6 rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <h3 className="text-base font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-sm text-zinc-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 px-6 md:px-12 bg-zinc-900/30">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How it works</h2>
            <p className="text-zinc-400 mb-16">Three steps to your first 3D model</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Describe your model', desc: 'Type a natural language description of what you want to create.', icon: '✍️' },
              { step: '02', title: 'AI generates it', desc: 'Claude AI processes your description and creates a 3D scene with multiple objects.', icon: '🤖' },
              { step: '03', title: 'Edit & export', desc: 'Tweak materials, positions, and export as STL or GLTF when done.', icon: '📦' },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                viewport={{ once: true }}
                className="relative"
              >
                <div className="text-5xl mb-4">{item.icon}</div>
                <div className="text-xs font-bold text-blue-500 mb-2 tracking-widest">{item.step}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                <p className="text-zinc-500 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 md:px-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="max-w-2xl mx-auto text-center"
        >
          <div className="p-12 rounded-3xl bg-gradient-to-br from-blue-600/20 via-purple-600/10 to-zinc-900 border border-zinc-700">
            <Sparkles className="w-10 h-10 text-blue-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold mb-4">Ready to design?</h2>
            <p className="text-zinc-400 mb-8">
              Free forever. No account needed. Just open and start creating.
            </p>
            <Link
              to="/editor"
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors text-lg"
            >
              <Sparkles className="w-5 h-5" />
              Start Designing Free
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-6 md:px-12 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
            <Box className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-white">CAD AI Studio</span>
        </div>
        <p className="text-xs text-zinc-600">Powered by Claude AI · Built with Three.js · Free & Open</p>
      </footer>
    </div>
  )
}
