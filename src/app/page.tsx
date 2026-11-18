"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import Navbar, { type NavSectionId } from "@/components/Navbar";
import HeadphoneScrollytelling from "@/components/HeadphoneScrollytelling";
import SpecsAndOrderSection from "@/components/SpecsAndOrderSection";
import {
  isColorwayId,
  type RockerzColorwayId,
} from "@/lib/rockerz440Config";
import { getChapter, scrollToStageProgress } from "@/lib/chapters";

const DEFAULT_COLORWAY: RockerzColorwayId = "active-black";
const COLOR_QUERY_PARAM = "color";

export default function HomePage() {
  const scrollyContainerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = Boolean(useReducedMotion());
  const [activeNavSection, setActiveNavSection] =
    useState<NavSectionId>("overview");
  const [selectedColorway, setSelectedColorway] =
    useState<RockerzColorwayId>(DEFAULT_COLORWAY);
  const beatRef = useRef<NavSectionId>("overview");

  // Restore a shared colourway from ?color=… (read after mount: the page is statically exported).
  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get(
      COLOR_QUERY_PARAM
    );
    if (fromUrl && isColorwayId(fromUrl)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from the URL
      setSelectedColorway(fromUrl);
    }
  }, []);

  const handleSelectColorway = useCallback((id: RockerzColorwayId) => {
    setSelectedColorway(id);
    const url = new URL(window.location.href);
    if (id === DEFAULT_COLORWAY) url.searchParams.delete(COLOR_QUERY_PARAM);
    else url.searchParams.set(COLOR_QUERY_PARAM, id);
    window.history.replaceState(window.history.state, "", url);
  }, []);

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

  // Keep the navbar indicator in sync across the sticky stage and the sections below it.
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

  const handleNavigate = useCallback(
    (target: NavSectionId) => {
      // The "explore" nav target is the configurator section, not the final story beat.
      const chapter = target === "explore" ? undefined : getChapter(target);
      if (chapter && scrollyContainerRef.current) {
        scrollToStageProgress(
          scrollyContainerRef.current,
          chapter.jumpTo,
          !reducedMotion
        );
        return;
      }
      document.getElementById(target)?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
    },
    [reducedMotion]
  );

  return (
    <main className="relative min-h-screen bg-obsidian text-white">
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
        onSelectColorway={handleSelectColorway}
      />
    </main>
  );
}
