import { brandConfig } from "@/config/brand.config";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Instagram } from "lucide-react";

export function TeamSection() {
  if (!brandConfig.features.teamSection) return null;

  const team = brandConfig.content.team;

  return (
    <section className="py-20 bg-muted">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl md:text-4xl font-bold">
            Meet Our Team
          </h2>
          <p className="mt-3 text-muted-foreground">
            Expert aestheticians dedicated to your beauty
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {team.map((member) => (
            <Card
              key={member.name}
              className="overflow-hidden border-border text-center"
            >
              {/* Photo */}
              <div className="h-64 bg-muted img-placeholder">
                {member.image ? (
                  <div
                    className="h-full w-full bg-cover bg-center bg-top"
                    style={{ backgroundImage: `url(${member.image})` }}
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-4xl text-muted-foreground">
                    {member.name.charAt(0)}
                  </div>
                )}
              </div>

              <CardContent className="pt-6">
                <h3 className="font-heading text-xl font-semibold">
                  {member.name}
                </h3>
                <p className="text-secondary text-sm font-medium mt-1">
                  {member.role}
                </p>
                <p className="text-muted-foreground text-sm mt-3 leading-relaxed">
                  {member.bio}
                </p>
                {member.socialMedia?.instagram && (
                  <Link
                    href={member.socialMedia.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-3 text-sm text-secondary hover:underline"
                  >
                    <Instagram className="h-4 w-4" />
                    Follow
                  </Link>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
