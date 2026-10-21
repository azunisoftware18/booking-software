"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Atom, CalendarDays, ChevronRight, Clock3, Compass, MapPin, Sparkles, Users } from "lucide-react";
import { motion } from "framer-motion";
import { usePlaces } from "@/hooks/usePlace";
import { useGetSetting } from "@/lib/queries/useSetting";
import { getUploadedAssetUrl } from "@/lib/assetUrl";

const reveal = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } } };

export default function Home() {
  const { data: places = [], isLoading } = usePlaces();
  const { data: setting } = useGetSetting();
  const [showTop, setShowTop] = useState(false);
  const firstPlace = places?.[0];
  const bookingLink = firstPlace ? `/book-tickets/${firstPlace.id || firstPlace._id}` : "#";
  const brand = setting?.companyName || "Science Park";
  const logo = getUploadedAssetUrl(setting?.logo) || "/logo.jpg";

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 500);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="bg-[#f7fbfa] text-[#123b45]">
      {showTop && <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="fixed bottom-6 right-6 z-50 rounded-full bg-[#e85d3f] p-3 text-white shadow-xl" aria-label="Back to top"><ChevronRight className="-rotate-90" size={20} /></button>}

      <section className="relative overflow-hidden bg-[#123b45] px-5 pb-16 pt-12 sm:px-8 lg:px-16 lg:pb-24">
        <div className="absolute -right-32 -top-40 h-[520px] w-[520px] rounded-full bg-[#f3b562]/20 blur-3xl" /><div className="absolute -bottom-48 left-1/3 h-[420px] w-[420px] rounded-full bg-[#47a9a2]/25 blur-3xl" />
        <div className="relative mx-auto max-w-5xl items-center">
          <motion.div initial="hidden" animate="visible" variants={reveal}>
            <div className="mb-7 flex items-center gap-3 text-[#f3b562]"><Image src={logo} alt={`${brand} logo`} width={48} height={48} className="h-12 w-12 rounded-xl border border-white/30 bg-white object-contain p-1" /><span className="text-xs font-bold uppercase tracking-[0.24em]">Learn • Discover • Play</span></div>
            <p className="mb-4 text-sm font-semibold uppercase tracking-[0.28em] text-[#8dd8d0]">Welcome to {brand}</p>
            <h1 className="max-w-3xl text-5xl font-bold leading-[1.02] text-white sm:text-6xl lg:text-7xl">Where curiosity becomes an <span className="text-[#f3b562]">experience.</span></h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-white/75">Step into an interactive world of science, technology and imagination. Explore hands-on exhibits designed to make every visit memorable.</p>
            <div className="mt-9 flex flex-wrap gap-4"><Link href={bookingLink} className="inline-flex items-center gap-2 rounded-full bg-[#e85d3f] px-6 py-3.5 font-bold text-white shadow-lg shadow-[#e85d3f]/20 transition hover:-translate-y-0.5 hover:bg-[#f06f51]">Plan your visit <ArrowRight size={18} /></Link><a href="#highlights" className="inline-flex items-center gap-2 rounded-full border border-white/25 px-6 py-3.5 font-bold text-white transition hover:bg-white/10">How it works</a><Link href="/login" className="inline-flex items-center gap-2 rounded-full border border-[#f3b562]/60 px-6 py-3.5 font-bold text-[#f3b562] transition hover:bg-[#f3b562] hover:text-[#123b45]">Login</Link></div>
            <div className="mt-10 flex flex-wrap gap-8 text-sm text-white/70"><span className="flex items-center gap-2"><Users size={17} className="text-[#f3b562]" /> For curious minds of every age</span><span className="flex items-center gap-2"><Clock3 size={17} className="text-[#f3b562]" /> Open daily</span></div>
          </motion.div>
        </div>
      </section>

      <section id="highlights" className="mx-auto grid max-w-7xl gap-5 px-5 py-12 sm:grid-cols-3 sm:px-8 lg:px-16">{[{ icon: Atom, title: "Hands-on learning", text: "Touch, test and understand the world around you." }, { icon: Compass, title: "Explore together", text: "A welcoming destination for families and school groups." }, { icon: Sparkles, title: "A day of discovery", text: "Fresh questions and unforgettable moments at every turn." }].map(({ icon: Icon, title, text }) => <motion.div variants={reveal} initial="hidden" whileInView="visible" viewport={{ once: true }} key={title} className="rounded-2xl border border-[#d9e8e4] bg-white p-6 shadow-sm"><div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8f6f2] text-[#16867e]"><Icon size={22} /></div><h2 className="text-lg font-bold text-[#123b45]">{title}</h2><p className="mt-2 text-sm leading-6 text-[#557078]">{text}</p></motion.div>)}</section>

      <section className="mx-5 mb-16 overflow-hidden rounded-[2rem] bg-[#e8f6f2] sm:mx-8 lg:mx-auto lg:max-w-7xl"><div className="grid items-center gap-8 px-7 py-10 sm:px-12 md:grid-cols-[1fr_auto] md:py-14"><div><p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.22em] text-[#16867e]"><CalendarDays size={17} /> Make a day of it</p><h2 className="mt-3 max-w-2xl text-3xl font-bold text-[#123b45] sm:text-4xl">Bring your class, your family or your curiosity.</h2><p className="mt-4 max-w-xl leading-7 text-[#557078]">From first-time visitors to lifelong learners, everyone has a place here. Book ahead for a smoother visit.</p></div><Link href={bookingLink} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#123b45] px-6 py-3.5 font-bold text-white transition hover:bg-[#1b5663]">Book tickets <ArrowRight size={18} /></Link></div></section>

      <section className="mx-auto max-w-7xl px-5 pb-20 text-center sm:px-8 lg:px-16"><MapPin className="mx-auto text-[#e85d3f]" size={24} /><h2 className="mt-3 text-3xl font-bold text-[#123b45]">Find your way to us</h2><p className="mx-auto mt-3 max-w-xl text-[#557078]">Questions about timings, access or group visits? Our team is ready to help.</p>{setting?.email && <a href={`mailto:${setting.email}`} className="mt-5 inline-block font-bold text-[#16867e] hover:text-[#e85d3f]">{setting.email}</a>}</section>
    </div>
  );
}
