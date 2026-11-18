"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Navbar, { type NavSectionId } from "@/components/Navbar";
import HeadphoneScrollytelling from "@/components/HeadphoneScrollytelling";
import SpecsAndOrderSection from "@/components/SpecsAndOrderSection";
import type { RockerzColorwayId } from "@/lib/rockerz440Config";

export default function HomePage() {
  const scrollyContainerRef = useRef<HTMLDivElement>(null);
  const [activeNavSection, setActiveNavSection] =
    useState<NavSectionId>("overview");
  const [selectedColorway, setSelectedColorway] =
    useState<RockerzColorwayId>("active-black");
  const beatRef = useRef<NavSectionId>("overview");

  const handleActiveBeatChange = useCallback((section: NavSectionId) => {
    beatRef.current = section;
    const specsEl = document.getElementById("specifications");
    if (
      !specsEl ||
      specsEl.getBoundingClientRect().top > window.innerHeight * 0.45
    ) {
      setActiveNavSection(section);
    }
  }, []);

  // Synchronize active navbar indicator across sticky scroll phases and lower sections
  useEffect(() => {
    const updateActiveNav = () => {
      const specsEl = document.getElementById("specifications");
      const exploreEl = document.getElementById("explore");
      const threshold = window.innerHeight * 0.45;

      if (exploreEl && exploreEl.getBoundingClientRect().top <= threshold) {
        setActiveNavSection("explore");
        return;
      }
      if (specsEl && specsEl.getBoundingClientRect().top <= threshold) {
        setActiveNavSection("specifications");
        return;
      }
      setActiveNavSection(beatRef.current);
    };

    updateActiveNav();
    window.addEventListener("scroll", updateActiveNav, { passive: true });
    return () => window.removeEventListener("scroll", updateActiveNav);
  }, []);

  const scrollToStageFraction = useCallback((fraction: number) => {
    const el = scrollyContainerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const top = window.scrollY + rect.top;
    const scrollable = Math.max(0, el.offsetHeight - window.innerHeight);
    window.scrollTo({
      top: top + scrollable * fraction,
      behavior: "smooth",
    });
  }, []);

  const handleNavigate = useCallback(
    (target: NavSectionId) => {
      if (target === "overview") {
        scrollToStageFraction(0);
        return;
      }
      if (target === "design") {
        scrollToStageFraction(0.3);
        return;
      }
      if (target === "engineering") {
        scrollToStageFraction(0.56);
        return;
      }
      if (target === "sound") {
        scrollToStageFraction(0.78);
        return;
      }
      const sectionEl = document.getElementById(target);
      if (sectionEl) {
        sectionEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [scrollToStageFraction]
  );

  return (
    <main className="relative min-h-screen bg-[#050505] text-white">
      <Navbar onNavigate={handleNavigate} activeSection={activeNavSection} />

      <HeadphoneScrollytelling
        containerRef={scrollyContainerRef}
        colorway={selectedColorway}
        onActiveBeatChange={handleActiveBeatChange}
        onJumpToSpecs={() => handleNavigate("specifications")}
        onJumpToExplore={() => handleNavigate("explore")}
      />

      <SpecsAndOrderSection
        selectedColorway={selectedColorway}
        onSelectColorway={setSelectedColorway}
      />
    </main>
  );
}
