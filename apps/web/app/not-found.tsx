import Link from "next/link";
import { AppShell, EmptyState, PageWrap, Panel } from "@/app/_components/sports-ui";

export default function NotFound() {
  return (
    <AppShell>
      <PageWrap>
        <Panel>
          <div className="p-6">
            <EmptyState title="Pagina no encontrada" text="No encontramos el contenido que buscabas." />
            <Link href="/" className="mt-4 inline-flex rounded-lg bg-slate-950 px-4 py-3 text-sm font-black text-white dark:bg-white dark:text-slate-950">
              Volver al inicio
            </Link>
          </div>
        </Panel>
      </PageWrap>
    </AppShell>
  );
}
