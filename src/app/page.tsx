import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  FileUp,
  ScanText,
  Calculator,
  BellRing,
  Building2,
  Upload,
  Sparkles,
} from "lucide-react";

const features = [
  {
    icon: FileUp,
    title: "Upload documente",
    description:
      "Incarca facturi, extrase de cont si alte documente direct din browser. Drag & drop simplu.",
  },
  {
    icon: ScanText,
    title: "OCR automat",
    description:
      "Documentele sunt citite automat. Datele sunt extrase si organizate fara efort manual.",
  },
  {
    icon: Calculator,
    title: "Calcul taxe",
    description:
      "Taxele se calculeaza automat pe baza documentelor incarcate. Mereu la zi cu legislatia.",
  },
  {
    icon: BellRing,
    title: "Notificari inteligente",
    description:
      "Primesti alerte pentru termene limita, documente lipsa si modificari importante.",
  },
];

const steps = [
  {
    number: 1,
    icon: Building2,
    title: "Adauga firma",
    description: "Inregistreaza firma ta sau firma clientului in cateva secunde.",
  },
  {
    number: 2,
    icon: Upload,
    title: "Incarca documente",
    description: "Drag & drop facturi, extrase si alte documente contabile.",
  },
  {
    number: 3,
    icon: Sparkles,
    title: "Taxele se calculeaza automat",
    description: "OCR-ul extrage datele, iar taxele sunt calculate instant.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="mx-auto max-w-6xl flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
              CS
            </div>
            <span className="text-lg font-semibold text-foreground">ContaSync</span>
          </Link>
          <nav className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Autentificare</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Incepe gratuit</Link>
            </Button>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="relative mx-auto max-w-6xl px-6 py-24 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-6xl">
              Contabilitatea ta,{" "}
              <span className="text-primary">sincronizata.</span>
            </h1>
            <p className="mt-6 text-lg text-muted-foreground md:text-xl max-w-2xl mx-auto">
              Platforma de colaborare intre firme de contabilitate si clienti.
              Upload documente, OCR automat, calcul taxe si notificari
              inteligente — totul intr-un singur loc.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="text-base px-8 h-12" asChild>
                <Link href="/signup">Incepe gratuit</Link>
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-8 h-12"
                asChild
              >
                <Link href="#cum-functioneaza">Vezi cum functioneaza</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            Tot ce ai nevoie, intr-o singura platforma
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            ContaSync simplifica fluxul de lucru dintre contabil si client.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title} className="border bg-card">
              <CardContent className="pt-0">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary mb-4">
                  <feature.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-foreground text-base">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="cum-functioneaza"
        className="bg-muted/50 border-y"
      >
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-foreground md:text-4xl">
              Cum functioneaza?
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
              Trei pasi simpli pentru a-ti digitaliza contabilitatea.
            </p>
          </div>
          <div className="grid gap-10 md:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground text-xl font-bold mb-5">
                  {step.number}
                </div>
                <h3 className="font-semibold text-foreground text-lg">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed max-w-xs mx-auto">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            Gata sa simplifici contabilitatea?
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Creeaza un cont gratuit si incepe sa colaborezi cu clientii tai in
            cateva minute.
          </p>
          <Button size="lg" className="mt-8 text-base px-8 h-12" asChild>
            <Link href="/signup">Creeaza cont gratuit</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-white">
        <div className="mx-auto max-w-6xl px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
                CS
              </div>
              <span className="text-sm font-semibold text-foreground">
                ContaSync
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; 2026 ContaSync. Toate drepturile rezervate.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
