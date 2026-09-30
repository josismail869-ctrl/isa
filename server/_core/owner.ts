export function isConfiguredOwner(
  openId: string,
  email: string | null | undefined,
  ownerOpenId: string,
  ownerEmail: string
) {
  return (
    (Boolean(ownerOpenId) && openId === ownerOpenId) ||
    (Boolean(ownerEmail) && email?.trim().toLowerCase() === ownerEmail)
  );
}
