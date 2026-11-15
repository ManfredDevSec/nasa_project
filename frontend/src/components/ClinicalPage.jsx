// A plain white page for the eye test, like a printed chart in a clinic: no dark app frame,
// no space backdrop, no motion behind the letters. The `clinical` class (index.css) flips the
// colour tokens, so the test screens keep using the same Tailwind classes as the rest of the app.
export default function ClinicalPage({ children }) {
  return (
    <div className="clinical min-h-dvh">
      <main className="mx-auto w-full max-w-6xl px-4 pt-6 pb-10 md:px-6 md:pt-8">{children}</main>
    </div>
  )
}
