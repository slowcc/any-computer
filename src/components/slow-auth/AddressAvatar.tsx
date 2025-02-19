import BoringAvatar from "boring-avatars";
import type { Types } from "connectkit";

export function AddressAvatar({
  address,
  ensImage,
  ensName,
  size,
  radius,
}: Types.CustomAvatarProps) {
  const parts = address
    ? address
        .slice(2)
        .match(/.{1,6}/g)
        ?.filter((i) => i.length === 6)
        .map((i) => `#${i.toUpperCase()}`) ?? []
    : [];

  return ensImage ? (
    <img src={ensImage} width={size ?? 32} height={size ?? 32} />
  ) : (
    <BoringAvatar
      radius={radius ?? 100}
      size={size ?? 32}
      name={ensName ?? address}
      variant="sunset"
      colors={parts}
    />
  );
}
