"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { Menu, X } from "lucide-react";

export type NavSectionId =
  | "overview"
  | "design"
  | "engineering"
  | "sound"
  | "specifications"
  | "explore";

interface NavbarProps {
  onNavigate: (target: NavSectionId) => void;
  activeSection: NavSectionId;
}

const NAV_LINKS: Array<{ id: NavSectionId; label: string }> = [
  { id: "overview", label: "Overview" },
  { id: "design", label: "Design" },
  { id: "engineering", label: "Engineering" },
  { id: "sound", label: "Sound" },
  { id: "specifications", label: "Specifications" },
];

export default function Navbar({ onNavigate, activeSection }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 220,
    damping: 32,
    restDelta: 0.0005,
  });

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 32);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLinkClick = (id: NavSectionId) => {
    setMobileOpen(false);
    onNavigate(id);
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled || mobileOpen
          ? "glass-nav border-b border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.6)]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto flex h-[56px] max-w-[1320px] items-center justify-between px-5 sm:px-8">
        {/* Left: Authentic boAt Logo + Rockerz 440 */}
        <button
          type="button"
          onClick={() => handleLinkClick("overview")}
          className="group flex items-center gap-3 text-left focus:outline-none"
          aria-label="boAt Rockerz 440 Home"
        >
          <span className="flex items-center gap-1.5">
            {/* Geometric boAt Triangle-A Mark */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 32 32"
              fill="none"
              aria-hidden="true"
              className="transition-transform duration-300 group-hover:scale-105"
            >
              <path
                d="M16 3L29 27H22.2L16 15.2L9.8 27H3L16 3Z"
                fill="#FF3B30"
              />
              <path d="M16 19.2L20.2 26.8H11.8L16 19.2Z" fill="#050505" />
            </svg>
            <span className="text-[15px] font-bold tracking-[-0.03em] text-white">
              bo<span className="text-[#FF3B30]">A</span>t
            </span>
          </span>
          <span className="h-3.5 w-[1px] bg-white/15" aria-hidden="true" />
          <span className="text-[13.5px] font-medium tracking-[-0.015em] text-white/85 transition-colors duration-300 group-hover:text-white">
            Rockerz 440
          </span>
        </button>

        {/* Center: Desktop Section Links */}
        <nav
          aria-label="Primary Product Navigation"
          className="hidden md:flex items-center gap-7 lg:gap-8"
        >
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => handleLinkClick(link.id)}
                className={`relative py-1 text-[12.5px] font-medium tracking-[-0.01em] transition-colors duration-300 focus:outline-none ${
                  isActive
                    ? "text-white"
                    : "text-[#A1A1AA] hover:text-white/95"
                }`}
              >
                {link.label}
                {isActive && (
                  <motion.span
                    layoutId="boat-nav-active-indicator"
                    transition={{ type: "spring", stiffness: 380, damping: 34 }}
                    className="absolute -bottom-[1px] left-0 right-0 h-[1.5px] rounded-full bg-[#FF3B30] shadow-[0_0_10px_rgba(255,59,48,0.7)]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Explore Product CTA + Mobile Menu Toggle */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleLinkClick("explore")}
            className="btn-nav-pill rounded-full px-4 py-1.5 text-[12px] font-medium tracking-[-0.01em] text-white focus:outline-none"
          >
            Explore Product
          </button>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/85 transition-colors hover:border-white/25 hover:text-white md:hidden"
          >
            {mobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Responsive Mobile Navigation Drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Mobile Navigation"
            className="overflow-hidden border-t border-white/[0.08] bg-[#050505]/95 px-6 py-4 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const isActive = activeSection === link.id;
                return (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => handleLinkClick(link.id)}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition-colors ${
                      isActive
                        ? "bg-white/[0.06] text-white"
                        : "text-[#A1A1AA] hover:bg-white/[0.03] hover:text-white"
                    }`}
                  >
                    <span>{link.label}</span>
                    {isActive && (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#FF3B30]" />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Ultra-thin 1px Scroll Progress Accent Hairline */}
      <motion.div
        style={{ scaleX: smoothProgress }}
        className={`absolute bottom-0 left-0 right-0 h-[1px] origin-left bg-gradient-to-r from-[#FF3B30]/60 via-[#FF3B30] to-white/70 transition-opacity duration-500 ${
          scrolled ? "opacity-85" : "opacity-0"
        }`}
      />
    </motion.header>
  );
}
