"use client";
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePlaces } from "@/hooks/usePlace";
import BookNowBtn from "./ui/BookNowBtn";
import { useGetSetting } from "@/lib/queries/useSetting";
import { getUploadedAssetUrl } from "@/lib/assetUrl";
import { Menu, X } from "lucide-react";
const Header = () => {
  const [scrolled, setScrolled] = useState(false);
  const { data: places = [] } = usePlaces();
  const firstPlace = places?.[0];
  const bookingLink = firstPlace
    ? `/book-tickets/${firstPlace.id || firstPlace._id}`
    : "#";
  const { data: setting } = useGetSetting();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <nav
      className={`fixed w-full z-999 top-0 left-0 transition-all duration-300 border-b backdrop-blur-xl ${scrolled ? "bg-[#123b45]/95 shadow-xl border-white/10 py-2" : "bg-white/95 border-[#d9e8e4] py-2"}`}
    >
      <div className="max-w-7xl flex items-center justify-between mx-auto px-4 sm:px-6 lg:px-10 h-15">
        <Link href="/" className="flex items-center gap-3 group">
          <img
            src={
              setting?.logo
                ? getUploadedAssetUrl(setting.logo)
              : "/logo.jpg"
            }
            alt="Logo"
            className="w-11 h-11 md:w-12 md:h-12 rounded-xl border border-[#d9e8e4] bg-white object-contain p-1 shadow-sm transition-all duration-300 group-hover:scale-105"
          />

          <p
            className={`font-bold text-lg sm:text-xl leading-tight ${
              scrolled ? "text-white" : "text-[#123b45]"
            }`}
          >
            {setting?.companyName || "Science Park"}

            <br />

            <span className="text-[#e85d3f] text-[10px] uppercase tracking-[3px]">
              Discover more
            </span>
          </p>
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          <a href="#highlights" className={`text-sm font-bold ${scrolled ? "text-white/80 hover:text-white" : "text-[#557078] hover:text-[#123b45]"}`}>Why visit</a>
          <a href="#footer" className={`text-sm font-bold ${scrolled ? "text-white/80 hover:text-white" : "text-[#557078] hover:text-[#123b45]"}`}>Visit us</a>
          <Link href="/login" className={`text-sm font-bold ${scrolled ? "text-white/80 hover:text-white" : "text-[#557078] hover:text-[#123b45]"}`}>Login</Link>
          <Link href={bookingLink}>
            <BookNowBtn
              title={"Book a visit"}
              addClass="bg-[#e85d3f] text-white border-none hover:bg-[#f06f51] hover:scale-[1.02] active:scale-[0.98] shadow-lg transition-all duration-300"
            />
          </Link>
        </div>
        <button className={`md:hidden ${scrolled ? "text-white" : "text-[#123b45]"}`} onClick={() => setMenuOpen((value) => !value)} aria-label="Toggle menu">{menuOpen ? <X /> : <Menu />}</button>
      </div>
      {menuOpen && <div className="border-t border-white/10 bg-[#123b45] px-6 py-5 md:hidden"><div className="flex flex-col gap-4 text-sm font-bold text-white"><a href="#highlights" onClick={() => setMenuOpen(false)}>Why visit</a><a href="#footer" onClick={() => setMenuOpen(false)}>Visit us</a><Link href="/login" onClick={() => setMenuOpen(false)}>Login</Link><Link href={bookingLink} onClick={() => setMenuOpen(false)}>Book a visit</Link></div></div>}
    </nav>
  );
};

export default Header;
