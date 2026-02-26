"use client";

import { useState } from "react";
import { brandConfig } from "@/config/brand.config";
import { BlogPostCard } from "@/components/sections/blog/BlogPostCard";

export function BlogGrid() {
  const posts = brandConfig.content.blog ?? [];
  const [activeCategory, setActiveCategory] = useState<string>("All");

  // Extract unique categories
  const categories = [
    "All",
    ...Array.from(new Set(posts.map((post) => post.category))),
  ];

  // Filter posts — exclude featured from the grid, then filter by category
  const filteredPosts = posts
    .filter((post) => !post.featured)
    .filter(
      (post) => activeCategory === "All" || post.category === activeCategory
    );

  return (
    <section className="py-20 bg-background">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        {/* Category filter pills */}
        <div className="flex flex-wrap gap-2 mb-10">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                activeCategory === category
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        {/* Posts grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredPosts.map((post) => (
            <BlogPostCard key={post.slug} post={post} />
          ))}
        </div>

        {filteredPosts.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            No posts found in this category.
          </p>
        )}
      </div>
    </section>
  );
}
