import type { Product } from "@/types/brand";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Heart, ShoppingBag } from "lucide-react";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const rating = product.rating ?? 0;

  return (
    <Card className="group overflow-hidden border-border hover:shadow-lg transition-shadow duration-300 py-0 gap-0">
      {/* Image area */}
      <div className="relative h-64 bg-cover bg-center img-placeholder overflow-hidden">
        <div
          className="h-full w-full bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
          style={{ backgroundImage: `url(${product.image})` }}
        />

        {/* Badge */}
        {product.badge && (
          <Badge
            variant="secondary"
            className="absolute top-3 left-3 text-xs"
          >
            {product.badge}
          </Badge>
        )}

        {/* Heart icon */}
        <button className="absolute top-3 right-3 p-2 rounded-full bg-white/80 text-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white">
          <Heart className="h-4 w-4" />
        </button>
      </div>

      {/* Details */}
      <div className="p-4 flex flex-col gap-2">
        {/* Category */}
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          {product.category.replace("-", " ")}
        </p>

        {/* Product name */}
        <h3 className="font-heading text-base font-semibold">{product.name}</h3>

        {/* Star rating */}
        {rating > 0 && (
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`h-4 w-4 ${
                  i < rating
                    ? "fill-secondary text-secondary"
                    : "text-muted-foreground/30"
                }`}
              />
            ))}
            {product.reviewCount !== undefined && (
              <span className="text-xs text-muted-foreground ml-1">
                ({product.reviewCount})
              </span>
            )}
          </div>
        )}

        {/* Price row */}
        <div className="flex items-center gap-2">
          {product.compareAtPrice && (
            <span className="line-through text-muted-foreground text-sm">
              {product.compareAtPrice}
            </span>
          )}
          <span className="font-semibold">{product.price}</span>
        </div>

        {/* Add to Bag */}
        <Button variant="outline" className="w-full mt-2">
          <ShoppingBag className="h-4 w-4" />
          Add to Bag
        </Button>
      </div>
    </Card>
  );
}
