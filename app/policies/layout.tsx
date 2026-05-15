import WhiteBackdrop from "./WhiteBackdrop";

// Policy pages read as clean documents — overrides the body gradient so the
// navbar + page background go solid white while any /policies/* route is
// mounted. Mounted via a child client component because `useEffect` can't
// run inside a server layout, and we want the variables reset on unmount.
export default function PoliciesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <WhiteBackdrop />
      {children}
    </>
  );
}
