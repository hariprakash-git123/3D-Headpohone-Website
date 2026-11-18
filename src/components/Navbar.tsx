"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
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

const FOCUS_RING =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-boatRed focus-visible:ring-offset-2 focus-visible:ring-offset-obsidian";

export default function Navbar({ onNavigate, activeSection }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);

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

  const closeMenu = useCallback((restoreFocus: boolean) => {
    setMobileOpen(false);
    if (restoreFocus) toggleRef.current?.focus();
  }, []);

  // Mobile drawer: focus the first link on open; close on Escape, outside click, or scroll.
  useEffect(() => {
    if (!mobileOpen) return;

    drawerRef.current?.querySelector<HTMLButtonElement>("button")?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeMenu(true);
    };
    const onPointerDown = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        closeMenu(false);
      }
    };
    const openedAtY = window.scrollY;
    const onScroll = () => {
      if (Math.abs(window.scrollY - openedAtY) > 48) closeMenu(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [mobileOpen, closeMenu]);

  const handleLinkClick = (id: NavSectionId) => {
    setMobileOpen(false);
    onNavigate(id);
  };

  const exploreActive = activeSection === "explore";

  return (
    <motion.header
      ref={headerRef}
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
        {/* Left: wordmark + product name */}
        <button
          type="button"
          onClick={() => handleLinkClick("overview")}
          className={`group flex items-center gap-3 rounded-md text-left ${FOCUS_RING}`}
          aria-label="boAt Rockerz 440, back to top"
        >
          <span className="flex items-center gap-1.5">
            {/* Decorative triangle mark (stylised, not the official boAt logo) */}
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
              bo<span className="text-boatRed">A</span>t
            </span>
          </span>
          <span className="h-3.5 w-[1px] bg-white/15" aria-hidden="true" />
          <span className="text-[13.5px] font-medium tracking-[-0.015em] text-white/85 transition-colors duration-300 group-hover:text-white">
            Rockerz 440
          </span>
        </button>

        {/* Center: desktop section links */}
        <nav
          aria-label="Primary"
          className="hidden md:flex items-center gap-7 lg:gap-8"
        >
          {NAV_LINKS.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => handleLinkClick(link.id)}
                aria-current={isActive ? "location" : undefined}
                className={`relative rounded-sm py-1 text-[12.5px] font-medium tracking-[-0.01em] transition-colors duration-300 ${FOCUS_RING} ${
                  isActive
                    ? "text-white"
                    : "text-mutedZinc hover:text-white/95"
                }`}
              >
                {link.label}
                {isActive && (
                  <motion.span
                    layoutId="boat-nav-active-indicator"
                    transition={{ type: "spring", stiffness: 380, damping: 34 }}
                    className="absolute -bottom-[1px] left-0 right-0 h-[1.5px] rounded-full bg-boatRed shadow-[0_0_10px_rgba(255,59,48,0.7)]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Explore Product CTA + mobile menu toggle */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleLinkClick("explore")}
            aria-current={exploreActive ? "location" : undefined}
            className={`btn-nav-pill rounded-full px-4 py-1.5 text-[12px] font-medium tracking-[-0.01em] text-white ${FOCUS_RING} ${
              exploreActive ? "!border-boatRed/70 !bg-boatRed/15" : ""
            }`}
          >
            Explore Product
          </button>

          <button
            ref={toggleRef}
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/85 transition-colors hover:border-white/25 hover:text-white md:hidden ${FOCUS_RING}`}
          >
            {mobileOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Menu className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile navigation drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            ref={drawerRef}
            id="mobile-navigation"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            aria-label="Mobile"
            className="overflow-hidden border-t border-white/[0.08] bg-obsidian/95 px-6 py-4 backdrop-blur-xl md:hidden"
          >
            <div className="flex flex-col gap-1">
              {NAV_LINKS.map((link) => {
                const isActive = activeSection === link.id;
                return (
                  <button
                    key={link.id}
                    type="button"
                    onClick={() => handleLinkClick(link.id)}
                    aria-current={isActive ? "location" : undefined}
                    className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14px] font-medium transition-colors ${FOCUS_RING} ${
                      isActive
                        ? "bg-white/[0.06] text-white"
                        : "text-mutedZinc hover:bg-white/[0.03] hover:text-white"
                    }`}
                  >
                    <span>{link.label}</span>
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="h-1.5 w-1.5 rounded-full bg-boatRed"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      {/* Scroll progress hairline */}
      <motion.div
        aria-hidden="true"
        style={{ scaleX: smoothProgress }}
        className={`absolute bottom-0 left-0 right-0 h-[1px] origin-left bg-gradient-to-r from-boatRed/60 via-boatRed to-white/70 transition-opacity duration-500 ${
          scrolled ? "opacity-85" : "opacity-0"
        }`}
      />
    </motion.header>
  );
}
