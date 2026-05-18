// Resolve city + state from an India Post pincode via the public
// postalpincode.in API. Used by both `/addresses` and `/checkout` so a
// buyer who types their pincode gets city/state auto-filled and doesn't
// have to retype them on every order.
//
// Network-faily: returns null on any error so the caller can leave the
// city/state fields editable rather than blocking the form. India-only.

export async function lookupPincode(
  pin: string,
): Promise<{ city?: string; state?: string } | null> {
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
    const data = await res.json();
    const post = data?.[0]?.PostOffice?.[0];
    if (!post) return null;
    return {
      city: String(post.District || "").trim() || undefined,
      state: String(post.State || "").trim() || undefined,
    };
  } catch {
    return null;
  }
}
