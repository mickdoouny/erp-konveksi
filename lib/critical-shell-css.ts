/**
 * Fallback styles embedded in every HTML response.
 * Used when /_next/static CSS chunks fail (stale server after rebuild, LAN cache).
 */
export const CRITICAL_SHELL_CSS = `
:root{--neo-bg:#030304;--neo-orange:#ea580c;--neo-orange-glow:rgba(234,88,12,.35)}
*,*::before,*::after{box-sizing:border-box}
body{background:#030304;color:#fafafa;margin:0;font-family:ui-sans-serif,system-ui,sans-serif}
.flex{display:flex}
.flex-col{flex-direction:column}
.flex-row{flex-direction:row}
@media (min-width:768px){.md\\:flex-row{flex-direction:row}}
.items-center{align-items:center}
.justify-center{justify-content:center}
.min-h-screen{min-height:100vh}
.w-full{width:100%}
.max-w-md{max-width:28rem}
.relative{position:relative}
.z-10{z-index:10}
.px-4{padding-left:1rem;padding-right:1rem}
.py-16{padding-top:4rem;padding-bottom:4rem}
.p-8{padding:2rem}
.mt-8{margin-top:2rem}
.space-y-5>*+*{margin-top:1.25rem}
.text-2xl{font-size:1.5rem;line-height:2rem}
.font-bold{font-weight:700}
.text-white{color:#fff}
.text-zinc-400{color:#a1a1aa}
.text-zinc-500{color:#71717a}
.text-sm{font-size:.875rem;line-height:1.25rem}
.block{display:block}
.mb-2{margin-bottom:.5rem}
.mb-5{margin-bottom:1.25rem}
.rounded-lg{border-radius:.5rem}
.rounded-full{border-radius:9999px}
.border{border-width:1px;border-style:solid}
.border-emerald-500\\/40{border-color:rgba(16,185,129,.4)}
.bg-emerald-950\\/50{background:rgba(2,44,34,.5)}
.text-emerald-50{color:#ecfdf5}
.neo-main{flex:1;min-width:0;min-height:100vh;padding:1.5rem;color:#fafafa;background:#030304}
.neo-sidebar{flex-shrink:0}
@media (min-width:768px){.neo-sidebar{width:290px;min-width:290px;max-width:290px;min-height:100vh;height:100vh}}
.min-h-full{min-height:100%}
html{background:#030304}
#__next,body>div{min-height:100vh;background:#030304}
.overflow-x-auto{overflow-x:auto}
.overflow-y-auto{overflow-y:auto}
.space-y-1>*+*{margin-top:.25rem}
.text-center{text-align:center}
.text-xs{font-size:.75rem;line-height:1rem}
.text-xl{font-size:1.25rem;line-height:1.75rem}
.font-semibold{font-weight:600}
.font-medium{font-weight:500}
.uppercase{text-transform:uppercase}
.tracking-tight{letter-spacing:-.025em}
.tracking-widest{letter-spacing:.1em}
.tracking-wide{letter-spacing:.025em}
.p-3{padding:.75rem}
.p-4{padding:1rem}
.p-5{padding:1.25rem}
.p-6{padding:1.5rem}
.p-10{padding:2.5rem}
.mb-6{margin-bottom:1.5rem}
.mt-1{margin-top:.25rem}
.mt-2{margin-top:.5rem}
.mt-3{margin-top:.75rem}
.mt-4{margin-top:1rem}
.gap-2{gap:.5rem}
.gap-3{gap:.75rem}
.gap-4{gap:1rem}
.grid{display:grid}
.hidden{display:none}
@media (max-width:767px){.max-md\\:hidden{display:none}}
#sidebar-nav{display:block;flex:1 1 0%;min-height:0;overflow-y:auto}
@media (min-width:768px){#sidebar-nav{display:block!important}}
.border-dashed{border-style:dashed}
.border-zinc-700{border-color:#3f3f46}
.border-zinc-800{border-color:#27272a}
.text-zinc-200{color:#e4e4e7}
.text-zinc-300{color:#d4d4d8}
.text-zinc-400{color:#a1a1aa}
.text-orange-300{color:#fdba74}
.text-orange-400{color:#fb923c}
.no-underline{text-decoration:none}
.neo-card{border-radius:1rem;border:1px solid rgba(63,63,70,.85);background:rgba(12,12,16,.65);box-shadow:0 0 60px -24px var(--neo-orange-glow)}
.neo-input{width:100%;border-radius:.75rem;border:1px solid #3f3f46;background:rgba(9,9,11,.85);padding:.75rem 1rem;color:#fafafa;outline:none}
.neo-input:focus{border-color:#ea580c;box-shadow:0 0 0 3px rgba(234,88,12,.2)}
.neo-btn-primary{border-radius:.75rem;background:linear-gradient(135deg,#c2410c 0%,#ea580c 50%,#f97316 100%);color:#fff;font-weight:600;padding:.75rem 1.25rem;border:none;cursor:pointer;box-shadow:0 0 28px -6px var(--neo-orange-glow)}
.neo-btn-danger{border-radius:.75rem;background:linear-gradient(135deg,#b91c1c 0%,#dc2626 100%);color:#fff;font-weight:600;padding:.75rem 1.25rem;border:none;cursor:pointer}
.shrink-0{flex-shrink:0}
.flex-1{flex:1 1 0%}
.min-w-0{min-width:0}
.w-72{width:18rem}
.min-w-\\[290px\\]{min-width:290px}
.border-r{border-right:1px solid rgba(39,39,42,.9)}
.bg-zinc-950{background:#09090b}
`
