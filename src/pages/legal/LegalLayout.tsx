import { Link } from "react-router-dom";
import { ArrowLeft, Truck } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  title: string;
  updatedAt: string;
  children: ReactNode;
}

const LINKS = [
  { to: "/politica-de-privacidade", label: "Política de Privacidade" },
  { to: "/termos-de-servico", label: "Termos de Serviço" },
  { to: "/dados", label: "Exclusão de Dados" },
];

export function LegalLayout({ title, updatedAt, children }: Props) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <Truck className="h-5 w-5 text-primary" />
            <span>FricoTrack</span>
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: {updatedAt}</p>

        <article className="mt-8 space-y-6 text-[0.95rem] leading-relaxed text-foreground/90 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-2 [&_h2]:text-foreground [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1 [&_a]:text-primary [&_a]:underline">
          {children}
        </article>
      </main>

      <footer className="border-t border-border mt-12">
        <div className="max-w-3xl mx-auto px-4 py-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="hover:text-foreground">
              {l.label}
            </Link>
          ))}
          <span className="ml-auto">© {new Date().getFullYear()} FricoTrack</span>
        </div>
      </footer>
    </div>
  );
}

export const CONTATO_EMAIL = "contato@fricotrack.com.br";