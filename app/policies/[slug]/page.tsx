import Link from "next/link";
import { notFound } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

type PolicyDoc = { key: string; label: string; html: string };
type PolicyPayload = {
  slug: string;
  title: string;
  description: string;
  docs: PolicyDoc[];
};

async function fetchPolicy(slug: string): Promise<PolicyPayload | null> {
  try {
    const res = await fetch(`${API}/api/v1/policies/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (json?.error) return null;
    return (json?.data as PolicyPayload) || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = await fetchPolicy(slug);
  return {
    title: policy ? `${policy.title} · Suvcraft` : "Policy · Suvcraft",
    description: policy?.description,
  };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const policy = await fetchPolicy(slug);
  if (!policy) notFound();

  // Are any of the docs actually populated? If the admin hasn't entered
  // copy for this policy yet, render a friendly placeholder instead of a
  // blank page.
  const hasContent = policy.docs.some((d) => d.html && d.html.trim().length > 0);

  return (
    <div className="w-full bg-white min-h-screen">
      <div className="mx-auto w-full max-w-[860px] px-4 pt-6 pb-16 md:px-8">
        <nav className="text-[13px] text-[#8c8c8c] mb-4">
          <Link href="/" className="hover:text-ink">Home</Link>
          <span className="mx-1.5">›</span>
          <Link href="/faq" className="hover:text-ink">Help centre</Link>
          <span className="mx-1.5">›</span>
          <span className="text-ink">{policy.title}</span>
        </nav>

        <header className="mb-8">
          <h1 className="text-[28px] sm:text-[34px] font-bold text-ink leading-tight">{policy.title}</h1>
          {policy.description && (
            <p className="mt-2 text-[14px] text-[#525151] max-w-[640px]">{policy.description}</p>
          )}
        </header>

        {!hasContent ? (
          <div className="rounded-[12px] border border-dashed border-[#e7e7e7] bg-[#fafafa] p-10 text-center">
            <p className="text-[14px] text-[#525151]">This policy hasn&apos;t been published yet.</p>
            <Link href="/faq" className="mt-3 inline-flex h-[40px] items-center justify-center rounded-[10px] border border-ink bg-white px-5 text-[13px] font-bold text-ink hover:bg-ink hover:text-white transition-colors">
              Back to Help centre
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {policy.docs.map((doc) => (
              doc.html && doc.html.trim() ? (
                <section key={doc.key}>
                  {policy.docs.length > 1 && (
                    <h2 className="text-[20px] sm:text-[22px] font-bold text-ink mb-3">{doc.label}</h2>
                  )}
                  {/* Admin authors via a rich-text editor; the saved value is
                      HTML. Sanitisation happens at write time on admin side. */}
                  <div
                    className="policy-prose text-[14.5px] leading-[1.75] text-[#1c1c1c]"
                    dangerouslySetInnerHTML={{ __html: doc.html }}
                  />
                </section>
              ) : null
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
