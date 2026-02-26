"use client";

import { brandConfig } from "@/config/brand.config";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function GallerySection() {
  if (!brandConfig.features.gallery) return null;

  const gallery = brandConfig.content.gallery;
  const categories = ["All", ...new Set(gallery.map((item) => item.category).filter(Boolean))];
  const [activeCategory, setActiveCategory] = useState("All");

  const filteredItems =
    activeCategory === "All"
      ? gallery
      : gallery.filter((item) => item.category === activeCategory);

  return (
    <section className="py-20 bg-background">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold">
            Our Gallery
          </h2>
          <p className="mt-3 text-muted-foreground">
            See our work and results
          </p>
        </div>

        {/* Category filter tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat || "All")}
              className={cn(
                "px-4 py-2 text-sm rounded-full transition-colors",
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Gallery grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {filteredItems.map((item, index) => (
            <div
              key={index}
              className="aspect-square rounded-lg overflow-hidden bg-muted img-placeholder group cursor-pointer"
            >
              <div
                className="h-full w-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                style={{ backgroundImage: `url(${item.src})` }}
              >
                <div className="h-full w-full bg-black/0 group-hover:bg-black/20 transition-colors flex items-end p-4">
                  <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    {item.alt}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
