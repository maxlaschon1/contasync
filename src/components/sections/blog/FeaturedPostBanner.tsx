import type { BlogPost } from "@/types/brand";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

interface FeaturedPostBannerProps {
  post: BlogPost;
}

export function FeaturedPostBanner({ post }: FeaturedPostBannerProps) {
  const formattedDate = new Date(post.date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <section className="py-20 bg-muted">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Image */}
          <div
            className="h-80 bg-cover bg-center rounded-lg img-placeholder"
            style={{ backgroundImage: `url(${post.image})` }}
          />

          {/* Content */}
          <div>
            <Badge variant="secondary">{post.category}</Badge>

            <h2 className="mt-4 font-heading text-2xl md:text-3xl font-bold">
              {post.title}
            </h2>

            <p className="mt-4 text-muted-foreground leading-relaxed">
              {post.excerpt}
            </p>

            {/* Author row */}
            <div className="mt-6 flex items-center gap-3">
              {post.author.image && (
                <div
                  className="w-10 h-10 rounded-full bg-cover bg-center img-placeholder"
                  style={{ backgroundImage: `url(${post.author.image})` }}
                />
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span className="font-medium text-foreground">
                  {post.author.name}
                </span>
                <span>&middot;</span>
                <span>{formattedDate}</span>
                <span>&middot;</span>
                <span>{post.readTime}</span>
              </div>
            </div>

            <Button className="mt-8 bg-secondary text-secondary-foreground hover:bg-secondary/90">
              Read Article
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
