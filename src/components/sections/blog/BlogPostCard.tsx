import type { BlogPost } from "@/types/brand";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface BlogPostCardProps {
  post: BlogPost;
}

export function BlogPostCard({ post }: BlogPostCardProps) {
  const formattedDate = new Date(post.date).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <Card className="group overflow-hidden border-border hover:shadow-lg transition-shadow duration-300 py-0 gap-0">
      {/* Image area */}
      <div className="relative h-48 bg-cover bg-center img-placeholder overflow-hidden">
        <div
          className="h-full w-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
          style={{ backgroundImage: `url(${post.image})` }}
        />
        {/* Category badge */}
        <Badge
          variant="secondary"
          className="absolute top-3 left-3 text-xs"
        >
          {post.category}
        </Badge>
      </div>

      {/* Title */}
      <CardHeader className="pb-0">
        <h3 className="font-heading text-lg font-semibold line-clamp-2">
          {post.title}
        </h3>
      </CardHeader>

      {/* Excerpt + meta */}
      <CardContent>
        <p className="text-sm text-muted-foreground line-clamp-3">
          {post.excerpt}
        </p>

        {/* Author row */}
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          {post.author.image && (
            <div
              className="w-8 h-8 rounded-full bg-cover bg-center inline-block img-placeholder shrink-0"
              style={{ backgroundImage: `url(${post.author.image})` }}
            />
          )}
          <span className="font-medium text-foreground">
            {post.author.name}
          </span>
          <span>&middot;</span>
          <span>{formattedDate}</span>
          <span>&middot;</span>
          <span>{post.readTime}</span>
        </div>
      </CardContent>
    </Card>
  );
}
